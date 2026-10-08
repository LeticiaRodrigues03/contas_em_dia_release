"""Tests for the public privacy policy endpoint (/api/privacy)."""
import requests


class TestPrivacy:
    def test_privacy_returns_html_200_no_auth(self, api, base_url):
        # unauthenticated plain request (no Authorization header)
        r = requests.get(f"{base_url}/api/privacy")
        assert r.status_code == 200, r.text
        ctype = r.headers.get("content-type", "")
        assert "text/html" in ctype.lower(), f"expected text/html, got {ctype}"

    def test_privacy_contains_title_and_sections(self, api, base_url):
        r = requests.get(f"{base_url}/api/privacy")
        assert r.status_code == 200
        html = r.text

        # Title: "Contas em Dia — Política de Privacidade"
        # H1 uses &mdash; which renders as em dash. Check both forms.
        assert "Contas em Dia" in html and "Política de Privacidade" in html
        assert ("&mdash;" in html) or ("—" in html) or ("- Política de Privacidade" in html)

        # Required sections: dados, LGPD, contato
        lower = html.lower()
        assert "quais dados coletamos" in lower or "dados" in lower
        assert "lgpd" in lower
        assert "contato" in lower

    def test_privacy_no_auth_header_still_ok(self, api, base_url):
        # explicitly send a bogus auth header; endpoint must be public
        r = requests.get(f"{base_url}/api/privacy",
                         headers={"Authorization": "Bearer invalid-token"})
        assert r.status_code == 200
