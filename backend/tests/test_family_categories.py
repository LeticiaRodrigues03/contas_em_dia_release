# Tests for Conta Familiar (family groups) + shared bills + custom categories + account deletion
import uuid
import pytest
import requests

from conftest import BASE_URL, auth_headers

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/120"}
API = f"{BASE_URL}/api"


def H(u):
    return {**auth_headers(u["token"]), **UA}


def reg(name="TEST User"):
    email = f"TEST_{uuid.uuid4().hex[:10]}@contas.app"
    r = requests.post(f"{API}/auth/register", json={"name": name, "email": email, "password": "senha123"}, headers=UA)
    assert r.status_code == 201, r.text
    d = r.json()
    return {"token": d["access_token"], "user": d["user"], "id": d["user"]["id"]}


@pytest.fixture()
def users():
    created = [reg("TEST A"), reg("TEST B"), reg("TEST C")]
    yield created
    for u in created:
        requests.delete(f"{API}/auth/me", headers=H(u))


def mk_bill(u, name="TEST_bill", category="Moradia"):
    r = requests.post(f"{API}/bills", headers=H(u), json={
        "name": name, "amount": 10.5, "due_date": "2026-02-10", "recurring": False, "category": category})
    assert r.status_code == 201, r.text
    return r.json()


# ---------- Family ----------
class TestFamily:
    def test_get_null_without_group(self, users):
        r = requests.get(f"{API}/family", headers=H(users[0]))
        assert r.status_code == 200 and r.json() is None

    def test_create_and_409(self, users):
        a = users[0]
        r = requests.post(f"{API}/family", headers=H(a), json={"name": "  TEST Casa  "})
        assert r.status_code == 201, r.text
        f = r.json()
        assert f["name"] == "TEST Casa" and len(f["code"]) == 6 and f["owner_id"] == a["id"]
        assert [m["id"] for m in f["members"]] == [a["id"]] and f["members"][0]["is_owner"]
        assert "_id" not in f
        r2 = requests.post(f"{API}/family", headers=H(a), json={"name": "X"})
        assert r2.status_code == 409
        g = requests.get(f"{API}/family", headers=H(a)).json()
        assert g["id"] == f["id"]

    def test_join_flow_and_errors(self, users):
        a, b, _ = users
        f = requests.post(f"{API}/family", headers=H(a), json={"name": "TEST G"}).json()
        assert requests.post(f"{API}/family/join", headers=H(b), json={"code": "ZZZZZZ"}).status_code == 404
        assert requests.post(f"{API}/family/join", headers=H(b), json={"code": "abc"}).status_code == 422
        r = requests.post(f"{API}/family/join", headers=H(b), json={"code": f["code"].lower()})
        assert r.status_code == 200, r.text
        assert {m["id"] for m in r.json()["members"]} == {a["id"], b["id"]}
        assert requests.post(f"{API}/family/join", headers=H(b), json={"code": f["code"]}).status_code == 409
        # creator also cannot join another
        assert requests.post(f"{API}/family/join", headers=H(a), json={"code": f["code"]}).status_code == 409

    def test_owner_only_actions(self, users):
        a, b, c = users
        f = requests.post(f"{API}/family", headers=H(a), json={"name": "TEST G"}).json()
        requests.post(f"{API}/family/join", headers=H(b), json={"code": f["code"]})
        requests.post(f"{API}/family/join", headers=H(c), json={"code": f["code"]})
        assert requests.delete(f"{API}/family/members/{c['id']}", headers=H(b)).status_code == 403
        assert requests.post(f"{API}/family/code", headers=H(b)).status_code == 403
        r = requests.post(f"{API}/family/code", headers=H(a))
        assert r.status_code == 200 and r.json()["code"] != f["code"] and len(r.json()["code"]) == 6
        # old code invalid
        assert requests.post(f"{API}/family/join", headers=H(reg_tmp := reg()), json={"code": f["code"]}).status_code == 404
        requests.delete(f"{API}/auth/me", headers=H(reg_tmp))
        assert requests.delete(f"{API}/family/members/{a['id']}", headers=H(a)).status_code == 400
        r = requests.delete(f"{API}/family/members/{c['id']}", headers=H(a))
        assert r.status_code == 200 and c["id"] not in [m["id"] for m in r.json()["members"]]
        assert requests.get(f"{API}/family", headers=H(c)).json() is None

    def test_leave_transfer_and_dissolve(self, users):
        a, b, _ = users
        f = requests.post(f"{API}/family", headers=H(a), json={"name": "TEST G"}).json()
        requests.post(f"{API}/family/join", headers=H(b), json={"code": f["code"]})
        assert requests.post(f"{API}/family/leave", headers=H(a)).status_code == 204
        g = requests.get(f"{API}/family", headers=H(b)).json()
        assert g["owner_id"] == b["id"] and len(g["members"]) == 1
        assert requests.post(f"{API}/family/leave", headers=H(b)).status_code == 204
        assert requests.get(f"{API}/family", headers=H(b)).json() is None
        assert requests.post(f"{API}/family/join", headers=H(a), json={"code": f["code"]}).status_code == 404
        assert requests.post(f"{API}/family/leave", headers=H(a)).status_code == 404


# ---------- Shared bills ----------
class TestSharedBills:
    def test_union_and_cross_edit_then_leave(self, users):
        a, b, _ = users
        ba = mk_bill(a, "TEST_A_bill")
        bb = mk_bill(b, "TEST_B_bill")
        f = requests.post(f"{API}/family", headers=H(a), json={"name": "TEST G"}).json()
        requests.post(f"{API}/family/join", headers=H(b), json={"code": f["code"]})
        for u in (a, b):
            ids = {x["id"] for x in requests.get(f"{API}/bills", headers=H(u)).json()}
            assert {ba["id"], bb["id"]} <= ids
        # B edits A's bill
        r = requests.put(f"{API}/bills/{ba['id']}", headers=H(b), json={
            "name": "TEST_A_edited", "amount": 99, "due_date": "2026-02-11", "recurring": False, "category": "Água"})
        assert r.status_code == 200 and r.json()["user_id"] == a["id"]
        r = requests.patch(f"{API}/bills/{ba['id']}/paid", headers=H(b), json={"paid": True})
        assert r.status_code == 200 and r.json()["bill"]["paid"] is True
        g = requests.get(f"{API}/bills/{ba['id']}", headers=H(a)).json()
        assert g["name"] == "TEST_A_edited" and g["amount"] == 99 and g["paid"] is True
        ba2 = mk_bill(a, "TEST_A_del")
        assert requests.delete(f"{API}/bills/{ba2['id']}", headers=H(b)).status_code == 204
        assert requests.get(f"{API}/bills/{ba2['id']}", headers=H(a)).status_code == 404
        # B leaves
        requests.post(f"{API}/family/leave", headers=H(b))
        ids_b = {x["id"] for x in requests.get(f"{API}/bills", headers=H(b)).json()}
        assert ba["id"] not in ids_b and bb["id"] in ids_b
        assert requests.get(f"{API}/bills/{ba['id']}", headers=H(b)).status_code == 404
        assert requests.put(f"{API}/bills/{ba['id']}", headers=H(b), json={
            "name": "x", "amount": 1, "due_date": "2026-02-11", "recurring": False, "category": "Água"}).status_code == 404


# ---------- Categories ----------
class TestCategories:
    def test_defaults_and_validation(self, users):
        a = users[0]
        r = requests.get(f"{API}/categories", headers=H(a))
        assert r.status_code == 200 and len(r.json()) == 12 and r.json()[-1] == "Outros"
        assert requests.post(f"{API}/categories/custom", headers=H(a), json={"name": " a "}).status_code == 422
        assert requests.post(f"{API}/categories/custom", headers=H(a), json={"name": "moradia"}).status_code == 409
        r = requests.post(f"{API}/categories/custom", headers=H(a), json={"name": "  TEST   Pets  "})
        assert r.status_code == 201 and r.json()["name"] == "TEST Pets"
        assert requests.post(f"{API}/categories/custom", headers=H(a), json={"name": "test pets"}).status_code == 409
        cats = requests.get(f"{API}/categories", headers=H(a)).json()
        assert len(cats) == 13 and "TEST Pets" in cats
        custom = requests.get(f"{API}/categories/custom", headers=H(a)).json()
        assert len(custom["defaults"]) == 12 and custom["custom"][0]["name"] == "TEST Pets"

    def test_bill_category_resolution_rename_delete(self, users):
        a = users[0]
        cat = requests.post(f"{API}/categories/custom", headers=H(a), json={"name": "TEST Assin"}).json()
        b1 = mk_bill(a, "TEST_c1", "test assin")
        assert b1["category"] == "TEST Assin"
        b2 = mk_bill(a, "TEST_c2", "Desconhecida")
        assert b2["category"] == "Outros"
        r = requests.put(f"{API}/categories/custom/{cat['id']}", headers=H(a), json={"name": "TEST Streams"})
        assert r.status_code == 200 and r.json()["name"] == "TEST Streams"
        assert requests.get(f"{API}/bills/{b1['id']}", headers=H(a)).json()["category"] == "TEST Streams"
        # rename to default -> 409
        assert requests.put(f"{API}/categories/custom/{cat['id']}", headers=H(a), json={"name": "Lazer"}).status_code == 409
        assert requests.delete(f"{API}/categories/custom/{cat['id']}", headers=H(a)).status_code == 204
        g = requests.get(f"{API}/bills/{b1['id']}", headers=H(a))
        assert g.status_code == 200 and g.json()["category"] == "Outros"
        assert requests.delete(f"{API}/categories/custom/{cat['id']}", headers=H(a)).status_code == 404

    def test_other_user_cannot_touch_category(self, users):
        a, _, c = users
        cat = requests.post(f"{API}/categories/custom", headers=H(a), json={"name": "TEST Priv"}).json()
        assert requests.put(f"{API}/categories/custom/{cat['id']}", headers=H(c), json={"name": "TEST Hack"}).status_code == 404
        assert requests.delete(f"{API}/categories/custom/{cat['id']}", headers=H(c)).status_code == 404
        assert "TEST Priv" not in requests.get(f"{API}/categories", headers=H(c)).json()

    def test_family_shares_categories(self, users):
        a, b, _ = users
        requests.post(f"{API}/categories/custom", headers=H(a), json={"name": "TEST Fam"})
        f = requests.post(f"{API}/family", headers=H(a), json={"name": "TEST G"}).json()
        requests.post(f"{API}/family/join", headers=H(b), json={"code": f["code"]})
        assert "TEST Fam" in requests.get(f"{API}/categories", headers=H(b)).json()
        assert requests.post(f"{API}/categories/custom", headers=H(b), json={"name": "test fam"}).status_code == 409


# ---------- Account deletion ----------
class TestDeleteAccount:
    def test_delete_me_cleans_up(self):
        a, b = reg("TEST A"), reg("TEST B")
        try:
            f = requests.post(f"{API}/family", headers=H(a), json={"name": "TEST G"}).json()
            requests.post(f"{API}/family/join", headers=H(b), json={"code": f["code"]})
            bb = mk_bill(b, "TEST_bdel")
            requests.post(f"{API}/categories/custom", headers=H(b), json={"name": "TEST BCat"})
            assert requests.delete(f"{API}/auth/me", headers=H(b)).status_code == 204
            fam = requests.get(f"{API}/family", headers=H(a)).json()
            assert [m["id"] for m in fam["members"]] == [a["id"]]
            assert bb["id"] not in {x["id"] for x in requests.get(f"{API}/bills", headers=H(a)).json()}
            assert requests.get(f"{API}/auth/me", headers=H(b)).status_code == 401
            # NOTE: category handed over to family (detach_user) rather than deleted
            print("A categories after B deleted:", requests.get(f"{API}/categories", headers=H(a)).json()[12:])
        finally:
            requests.delete(f"{API}/auth/me", headers=H(a))
            requests.delete(f"{API}/auth/me", headers=H(b))
