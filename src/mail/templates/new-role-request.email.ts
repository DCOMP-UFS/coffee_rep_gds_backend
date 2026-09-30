import { ROLE_LABELS, Role } from '../../auth/roles';
import { formatBrazilianDateTime } from '../../common/date/local-date-time';
import { escapeHtml } from './escape-html';

export interface NewRoleRequestEmailInput {
  requestId: number;
  userName: string;
  userEmail: string | null;
  currentRole: Role;
  requestedRole: Role;
  justification: string;
  /** Horário de parede, na convenção do banco. */
  createdAt: Date;
  /** Link direto para a aba Pedidos; sem ele, o e-mail sai sem o botão. */
  reviewUrl: string | null;
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/**
 * Paleta do Ambulatório HU-UFS, a mesma do frontend (`src/index.css`). Clientes de e-mail
 * ignoram CSS externo e variáveis, então as cores vão fixas e inline.
 */
const BRAND = {
  navy: '#00305a',
  green: '#7faa1b',
  page: '#f3f6fa',
  card: '#ffffff',
  border: '#dae2ec',
  text: '#0f1b2d',
  muted: '#56657a',
  onNavy: '#d6e4f2',
  soft: '#eef2f7',
  accent: '#e6f1f9',
  accentText: '#01497a',
  greenSoft: '#eef6dc',
} as const;

const FONT = "'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const LABEL_STYLE = `font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${BRAND.muted}`;

export function buildNewRoleRequestEmail(input: NewRoleRequestEmailInput): EmailContent {
  const userName = input.userName.replace(/\s+/g, ' ').trim();
  const currentRole = ROLE_LABELS[input.currentRole];
  const requestedRole = ROLE_LABELS[input.requestedRole];
  const createdAt = formatBrazilianDateTime(input.createdAt);
  const email = input.userEmail ?? 'Não informado';

  // Quebras de linha no assunto viram espaço: cabeçalho de e-mail é linha única.
  const subject = `Gestão de Salas — Novo pedido de acesso: ${userName}`;
  const preheader = `${userName} pediu o perfil ${requestedRole}.`;

  const html = layout({
    title: subject,
    preheader,
    body: [
      header(input.requestId),
      `<tr><td style="background:${BRAND.card};border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};padding:28px 32px 8px">`,
      paragraph(
        `<strong style="color:${BRAND.text}">${escapeHtml(userName)}</strong> pediu para subir de nível no sistema. Confira os dados e a justificativa antes de decidir.`,
      ),
      roleChange(currentRole, requestedRole),
      details([
        ['Nome', escapeHtml(userName)],
        ['E-mail', escapeHtml(email)],
        ['Data do pedido', escapeHtml(createdAt)],
      ]),
      justification(input.justification),
      input.reviewUrl ? reviewButton(input.reviewUrl) : '',
      `</td></tr>`,
      footer(),
    ].join(''),
  });

  const text = [
    `Novo pedido de acesso (#${input.requestId})`,
    '',
    `${userName} pediu para subir de nível no Gestão de Salas.`,
    '',
    `Perfil atual: ${currentRole}`,
    `Perfil pedido: ${requestedRole}`,
    `Nome: ${userName}`,
    `E-mail: ${email}`,
    `Data do pedido: ${createdAt}`,
    '',
    'Justificativa:',
    input.justification,
    ...(input.reviewUrl ? ['', `Analisar pedido: ${input.reviewUrl}`] : []),
    '',
    '—',
    'Aviso automático do Gestão de Salas · Ambulatório HU-UFS.',
  ].join('\n');

  return { subject, html, text };
}

/**
 * Estrutura em tabelas com estilo inline: é o único layout que Gmail, Outlook e clientes
 * móveis renderizam de forma consistente. O preheader é o resumo exibido na caixa de entrada.
 */
function layout({ title, preheader, body }: { title: string; preheader: string; body: string }): string {
  return (
    `<!DOCTYPE html><html lang="pt-BR"><head>` +
    `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">` +
    `<title>${escapeHtml(title)}</title></head>` +
    `<body style="margin:0;padding:0;background:${BRAND.page};-webkit-text-size-adjust:100%">` +
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.page}" style="background:${BRAND.page}">` +
    `<tr><td align="center" style="padding:32px 12px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;font-family:${FONT};color:${BRAND.text}">` +
    body +
    `</table></td></tr></table></body></html>`
  );
}

function header(requestId: number): string {
  return (
    `<tr><td bgcolor="${BRAND.navy}" style="background:${BRAND.navy};border-radius:12px 12px 0 0;padding:24px 32px 22px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>` +
    `<td style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${BRAND.onNavy}">` +
    `<span style="color:${BRAND.green}">&#9632;</span>&nbsp; Gestão de Salas</td>` +
    `<td align="right" style="font-family:${FONT};font-size:12px;color:${BRAND.onNavy}">Ambulatório HU-UFS</td>` +
    `</tr></table>` +
    `<h1 style="margin:18px 0 0;font-family:${FONT};font-size:22px;line-height:1.3;font-weight:700;color:#ffffff">Novo pedido de acesso</h1>` +
    `<p style="margin:4px 0 0;font-family:${FONT};font-size:14px;color:${BRAND.onNavy}">Pedido nº ${requestId}</p>` +
    `</td></tr>` +
    `<tr><td bgcolor="${BRAND.green}" style="background:${BRAND.green};height:4px;line-height:4px;font-size:0">&nbsp;</td></tr>`
  );
}

function paragraph(content: string): string {
  return `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${BRAND.muted}">${content}</p>`;
}

function roleChange(currentRole: string, requestedRole: string): string {
  const pill = (label: string, value: string, highlighted: boolean) =>
    `<td valign="top" style="padding:0">` +
    `<div style="${LABEL_STYLE}">${label}</div>` +
    `<span style="display:inline-block;margin-top:6px;padding:6px 12px;border-radius:999px;font-size:14px;font-weight:600;` +
    (highlighted
      ? `background:${BRAND.accent};color:${BRAND.accentText};border:1px solid #b9d6ec`
      : `background:${BRAND.soft};color:${BRAND.muted};border:1px solid ${BRAND.border}`) +
    `">${escapeHtml(value)}</span></td>`;

  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px"><tr>` +
    pill('Perfil atual', currentRole, false) +
    `<td valign="bottom" align="center" style="padding:0 14px 7px;font-size:20px;line-height:1;color:${BRAND.green}">&rarr;</td>` +
    pill('Perfil pedido', requestedRole, true) +
    `</tr></table>`
  );
}

function details(rows: Array<[label: string, htmlValue: string]>): string {
  const cells = rows
    .map(
      ([label, value], index) =>
        `<tr><td style="padding:12px 16px;${index > 0 ? `border-top:1px solid ${BRAND.border};` : ''}">` +
        `<div style="${LABEL_STYLE}">${label}</div>` +
        `<div style="margin-top:4px;font-size:15px;color:${BRAND.text};word-break:break-word">${value}</div>` +
        `</td></tr>`,
    )
    .join('');

  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ` +
    `style="margin:0 0 20px;background:${BRAND.page};border:1px solid ${BRAND.border};border-radius:10px;border-collapse:separate">` +
    cells +
    `</table>`
  );
}

function justification(value: string): string {
  return (
    `<div style="${LABEL_STYLE}">Justificativa</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px"><tr>` +
    `<td style="background:${BRAND.greenSoft};border-left:4px solid ${BRAND.green};border-radius:0 8px 8px 0;padding:14px 16px;` +
    `font-size:15px;line-height:1.6;color:${BRAND.text};white-space:pre-wrap;word-break:break-word">${escapeHtml(value)}</td>` +
    `</tr></table>`
  );
}

function reviewButton(url: string): string {
  const href = escapeHtml(url);
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 12px"><tr>` +
    `<td bgcolor="${BRAND.navy}" style="background:${BRAND.navy};border-radius:8px">` +
    `<a href="${href}" style="display:inline-block;padding:13px 32px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px">Analisar pedido</a>` +
    `</td></tr></table>` +
    `<p style="margin:0 0 20px;text-align:center;font-size:12px;line-height:1.5;color:${BRAND.muted}">` +
    `Ou abra <a href="${href}" style="color:${BRAND.accentText};word-break:break-all">${href}</a></p>`
  );
}

function footer(): string {
  return (
    `<tr><td style="background:${BRAND.card};border:1px solid ${BRAND.border};border-top:0;border-radius:0 0 12px 12px;padding:0 32px">` +
    `<p style="margin:0;padding:16px 0 20px;border-top:1px solid ${BRAND.border};font-size:12px;line-height:1.6;color:${BRAND.muted}">` +
    `Aviso automático do <strong>Gestão de Salas</strong> · Ambulatório HU-UFS. ` +
    `Só o administrador do sistema pode aprovar ou recusar pedidos de acesso.</p>` +
    `</td></tr>`
  );
}
