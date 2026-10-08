"""Backend tests for Contas em Dia (auth + bills + backup)."""
import calendar
import uuid
from datetime import date

import pytest
import requests

def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Auth ----------
class TestAuth:
    def test_register_login_me_flow(self, api, base_url):
        email = f"TEST_{uuid.uuid4().hex[:10]}@contas.app"
        r = api.post(f"{base_url}/api/auth/register",
                     json={"name": "TEST A", "email": email, "password": "senha123"})
        assert r.status_code == 201
        data = r.json()
        assert "access_token" in data and data["user"]["email"] == email.lower()

        # duplicate email -> 409
        r2 = api.post(f"{base_url}/api/auth/register",
                      json={"name": "TEST A", "email": email, "password": "senha123"})
        assert r2.status_code == 409

        # login
        rl = api.post(f"{base_url}/api/auth/login",
                      json={"email": email, "password": "senha123"})
        assert rl.status_code == 200
        token = rl.json()["access_token"]

        # me
        me = api.get(f"{base_url}/api/auth/me", headers=auth_headers(token))
        assert me.status_code == 200
        assert me.json()["email"] == email.lower()

        # cleanup
        api.delete(f"{base_url}/api/auth/me", headers=auth_headers(token))

    def test_login_invalid(self, api, base_url):
        r = api.post(f"{base_url}/api/auth/login",
                     json={"email": "nouser@contas.app", "password": "wrongpw"})
        assert r.status_code == 401

    def test_me_without_token_401(self, api, base_url):
        r = api.get(f"{base_url}/api/auth/me")
        assert r.status_code == 401

    def test_bills_without_token_401(self, api, base_url):
        r = api.get(f"{base_url}/api/bills")
        assert r.status_code == 401

    def test_delete_me_cascades_bills(self, api, base_url):
        email = f"TEST_{uuid.uuid4().hex[:10]}@contas.app"
        r = api.post(f"{base_url}/api/auth/register",
                     json={"name": "Del", "email": email, "password": "senha123"})
        token = r.json()["access_token"]
        # create bill
        api.post(f"{base_url}/api/bills",
                 headers=auth_headers(token),
                 json={"name": "TEST_cascade", "amount": 10, "due_date": "2026-02-10"})
        # delete account
        d = api.delete(f"{base_url}/api/auth/me", headers=auth_headers(token))
        assert d.status_code == 204
        # token invalid now
        me = api.get(f"{base_url}/api/auth/me", headers=auth_headers(token))
        assert me.status_code == 401


# ---------- Bills CRUD ----------
class TestBills:
    def test_crud_and_scoping(self, api, base_url, user_a, user_b):
        hA = auth_headers(user_a["token"])
        hB = auth_headers(user_b["token"])

        # list categories
        c = api.get(f"{base_url}/api/categories")
        assert c.status_code == 200 and "Moradia" in c.json()

        # create
        payload = {"name": "TEST_Energia", "amount": 150.55, "due_date": "2026-02-10",
                   "recurring": False, "category": "Energia", "notes": "n"}
        r = api.post(f"{base_url}/api/bills", headers=hA, json=payload)
        assert r.status_code == 201
        bill = r.json()
        assert bill["name"] == "TEST_Energia"
        assert bill["amount"] == 150.55
        assert bill["user_id"] == user_a["user"]["id"]
        bid = bill["id"]

        # GET verify persistence
        g = api.get(f"{base_url}/api/bills/{bid}", headers=hA)
        assert g.status_code == 200 and g.json()["name"] == "TEST_Energia"

        # user B cannot see it
        gb = api.get(f"{base_url}/api/bills/{bid}", headers=hB)
        assert gb.status_code == 404
        lb = api.get(f"{base_url}/api/bills", headers=hB)
        assert all(b["id"] != bid for b in lb.json())

        # update
        upd = {**payload, "name": "TEST_Energia2", "amount": 200, "category": "Água"}
        u = api.put(f"{base_url}/api/bills/{bid}", headers=hA, json=upd)
        assert u.status_code == 200 and u.json()["name"] == "TEST_Energia2"
        g2 = api.get(f"{base_url}/api/bills/{bid}", headers=hA)
        assert g2.json()["amount"] == 200 and g2.json()["category"] == "Água"

        # invalid category falls to Outros
        bad = api.post(f"{base_url}/api/bills", headers=hA,
                       json={"name": "TEST_x", "amount": 1, "due_date": "2026-03-01",
                             "category": "Zzz"})
        assert bad.json()["category"] == "Outros"
        api.delete(f"{base_url}/api/bills/{bad.json()['id']}", headers=hA)

        # delete
        d = api.delete(f"{base_url}/api/bills/{bid}", headers=hA)
        assert d.status_code == 204
        assert api.get(f"{base_url}/api/bills/{bid}", headers=hA).status_code == 404

    def test_toggle_paid_creates_next_recurring_once(self, api, base_url, user_a):
        h = auth_headers(user_a["token"])
        # Jan 31 so next month clamps to Feb 28 (2026)
        r = api.post(f"{base_url}/api/bills", headers=h, json={
            "name": "TEST_Rent", "amount": 1200, "due_date": "2026-01-31",
            "recurring": True, "category": "Moradia"})
        bid = r.json()["id"]

        # mark paid -> next_bill present and clamped
        p = api.patch(f"{base_url}/api/bills/{bid}/paid", headers=h, json={"paid": True})
        assert p.status_code == 200
        pj = p.json()
        assert pj["bill"]["paid"] is True
        assert pj["next_bill"] is not None
        year, month = 2026, 2
        last = calendar.monthrange(year, month)[1]
        assert pj["next_bill"]["due_date"] == f"2026-02-{last:02d}"
        assert pj["next_bill"]["recurring"] is True
        next_id = pj["next_bill"]["id"]

        # toggle back to unpaid, then paid again -> should NOT create duplicate
        api.patch(f"{base_url}/api/bills/{bid}/paid", headers=h, json={"paid": False})
        p2 = api.patch(f"{base_url}/api/bills/{bid}/paid", headers=h, json={"paid": True})
        assert p2.json()["next_bill"] is None, "Re-toggle should not duplicate next month bill"

        # verify total count: original + 1 next
        bills = api.get(f"{base_url}/api/bills", headers=h).json()
        rent_count = sum(1 for b in bills if b["name"] == "TEST_Rent")
        assert rent_count == 2, f"expected 2, got {rent_count}"

        # cleanup
        api.delete(f"{base_url}/api/bills/{bid}", headers=h)
        api.delete(f"{base_url}/api/bills/{next_id}", headers=h)

    def test_toggle_paid_non_recurring_no_next(self, api, base_url, user_a):
        h = auth_headers(user_a["token"])
        r = api.post(f"{base_url}/api/bills", headers=h, json={
            "name": "TEST_One", "amount": 10, "due_date": "2026-02-15",
            "recurring": False, "category": "Outros"})
        bid = r.json()["id"]
        p = api.patch(f"{base_url}/api/bills/{bid}/paid", headers=h, json={"paid": True})
        assert p.status_code == 200
        assert p.json()["next_bill"] is None
        assert p.json()["bill"]["paid_at"] is not None


# ---------- Backup ----------
class TestBackup:
    def test_export_import_replace(self, api, base_url, user_a):
        h = auth_headers(user_a["token"])
        # seed 2 bills
        for i, dd in enumerate(["2026-02-10", "2026-03-05"]):
            api.post(f"{base_url}/api/bills", headers=h, json={
                "name": f"TEST_bk_{i}", "amount": 10 + i, "due_date": dd,
                "category": "Outros"})

        exp = api.get(f"{base_url}/api/backup/export", headers=h)
        assert exp.status_code == 200
        data = exp.json()
        assert len(data["bills"]) == 2
        assert data["version"] == 1

        # import with replace False -> appends
        imp = api.post(f"{base_url}/api/backup/import", headers=h,
                       json={"bills": data["bills"], "replace": False})
        assert imp.status_code == 200 and imp.json()["imported"] == 2
        lst = api.get(f"{base_url}/api/bills", headers=h).json()
        assert len([b for b in lst if b["name"].startswith("TEST_bk_")]) == 4

        # import with replace True -> wipes & re-imports only 2
        imp2 = api.post(f"{base_url}/api/backup/import", headers=h,
                        json={"bills": data["bills"][:1], "replace": True})
        assert imp2.status_code == 200 and imp2.json()["imported"] == 1
        lst2 = api.get(f"{base_url}/api/bills", headers=h).json()
        assert len(lst2) == 1


# ---------- Validation ----------
class TestValidation:
    def test_register_short_password(self, api, base_url):
        r = api.post(f"{base_url}/api/auth/register",
                     json={"name": "x", "email": "x@x.com", "password": "123"})
        assert r.status_code == 422

    def test_bill_invalid_date(self, api, base_url, user_a):
        h = auth_headers(user_a["token"])
        r = api.post(f"{base_url}/api/bills", headers=h,
                     json={"name": "x", "amount": 1, "due_date": "not-a-date"})
        assert r.status_code == 422
