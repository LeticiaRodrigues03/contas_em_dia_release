from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["legal"])

PRIVACY_HTML = """<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Contas em Dia &mdash; Política de Privacidade</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px;color:#171717;line-height:1.6}
h1{color:#059669}h2{color:#047857;font-size:1.1rem;margin-top:1.6rem}</style></head><body>
<h1>Contas em Dia &mdash; Política de Privacidade</h1>
<p>Última atualização: 2026.</p>
<h2>Quais dados coletamos</h2><p>Nome, e-mail e senha (armazenada apenas como hash criptográfico) para criar sua conta, e as contas que você cadastra: nome, valor, vencimento, categoria e observações.</p>
<h2>Como usamos</h2><p>Os dados são usados exclusivamente para exibir suas contas, sincronizá-las entre seus aparelhos e agendar lembretes locais no seu dispositivo. Não vendemos nem compartilhamos seus dados com terceiros.</p>
<h2>Notificações</h2><p>Os lembretes são notificações locais geradas no próprio aparelho e podem ser desativadas a qualquer momento em Ajustes.</p>
<h2>Compartilhamento</h2><p>O resumo mensal só é compartilhado (por exemplo, no WhatsApp) quando você toca em compartilhar.</p>
<h2>Conta Familiar</h2><p>Ao criar ou entrar em um grupo familiar, suas contas e categorias passam a ser visíveis e editáveis pelas pessoas do grupo, e vice-versa. Você pode sair do grupo a qualquer momento.</p>
<h2>Anúncios</h2><p>O app exibe anúncios do Google AdMob. O AdMob pode usar o identificador de publicidade do aparelho para exibir anúncios; onde a lei exige, pedimos seu consentimento antes. Saiba mais em <a href="https://policies.google.com/technologies/ads">policies.google.com/technologies/ads</a>.</p>
<h2>Seus direitos (LGPD)</h2><p>Você pode exportar todos os seus dados (Ajustes &rarr; Exportar backup) e excluir sua conta e todos os dados permanentemente (Ajustes &rarr; Excluir minha conta).</p>
<h2>Segurança</h2><p>A comunicação com o servidor é criptografada (HTTPS) e o acesso é protegido por token pessoal armazenado de forma segura no aparelho.</p>
<h2>Contato</h2><p>Dúvidas sobre privacidade: <a href="mailto:leticiarodrigues173@gmail.com">leticiarodrigues173@gmail.com</a></p>
</body></html>"""


@router.get("/privacy", response_class=HTMLResponse)
async def privacy_policy():
    return PRIVACY_HTML
