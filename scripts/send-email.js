#!/usr/bin/env node

// ============================================================================
// GitHub 每日盲盒 — QQ Email Delivery Script (HTML Enhanced)
// ============================================================================
// Sends the digest via QQ SMTP with rich HTML formatting.
//
// Usage:
//   node send-email.js --to xxx@qq.com --subject "GitHub 每日盲盒" < digest.txt
//   node send-email.js --to xxx@qq.com --file /tmp/digest.txt
// ============================================================================

import { readFile } from 'fs/promises';
import { createTransport } from 'nodemailer';
import { config as loadEnv } from 'dotenv';
import { homedir } from 'os';
import { join } from 'path';
import { marked } from 'marked';

const QQ_SMTP_HOST = 'smtp.qq.com';
const QQ_SMTP_PORT = 465;

// -- Convert markdown digest to styled HTML body -----------------------------

function digestToHtml(digestText) {
  const rawHtml = marked.parse(digestText, { breaks: true, gfm: true });

  return rawHtml
    .replace(/<h1>/g, '<h1 style="font-size:28px;font-weight:700;margin:36px 0 16px;color:#1a1a2e;border-bottom:2px solid #2563eb;padding-bottom:10px;">')
    .replace(/<h2>/g, '<h2 style="font-size:24px;font-weight:700;margin:32px 0 14px;color:#2563eb;">')
    .replace(/<h3>/g, '<h3 style="font-size:21px;font-weight:700;margin:24px 0 12px;color:#1a1a2e;">')
    .replace(/<p>/g, '<p style="margin:0 0 18px;">')
    .replace(/<a /g, '<a style="color:#2563eb;text-decoration:underline;" ')
    .replace(/<code>/g, '<code style="background:#f0f2f5;padding:3px 8px;border-radius:4px;font-size:18px;color:#e11d48;">')
    .replace(/<pre>/g, '<pre style="background:#f0f2f5;padding:18px 22px;border-radius:8px;overflow-x:auto;font-size:17px;line-height:1.6;border:1px solid #e2e6ed;">')
    .replace(/<blockquote>/g, '<blockquote style="margin:18px 0;padding:14px 22px;border-left:4px solid #2563eb;background:#f8faff;color:#4a5568;">')
    .replace(/<ul>/g, '<ul style="margin:8px 0 18px;padding-left:30px;">')
    .replace(/<ol>/g, '<ol style="margin:8px 0 18px;padding-left:30px;">')
    .replace(/<li>/g, '<li style="margin:0 0 10px;">')
    .replace(/<strong>/g, '<strong style="font-weight:700;color:#1a1a2e;">')
    .replace(/<hr>/g, '<hr style="border:none;border-top:1px solid #e2e6ed;margin:36px 0;">');
}

// -- Build full HTML email ---------------------------------------------------

function buildEmailHtml(digestText, subject) {
  const titleMatch = digestText.match(/^#\s+(.+)$/m);
  const digestTitle = titleMatch ? titleMatch[1] : subject;
  const bodyHtml = digestToHtml(digestText);
  const dateStr = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans SC','Microsoft YaHei',sans-serif;font-size:20px;line-height:1.9;color:#1a1a2e;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f6f9;"><tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

    <tr><td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:40px 44px 32px;">
      <h1 style="margin:0;font-size:30px;font-weight:700;color:#fff;letter-spacing:-0.3px;">${escapeHtml(digestTitle)}</h1>
      <p style="margin:10px 0 0;font-size:16px;color:rgba(255,255,255,0.8);">GitHub 每日盲盒 · 每天 18:00 更新</p>
    </td></tr>

    <tr><td style="padding:36px 44px 28px;">
      <div style="color:#1a1a2e;font-size:20px;line-height:1.9;">${bodyHtml}</div>
    </td></tr>

    <tr><td style="padding:28px 44px 36px;border-top:1px solid #e8ecf1;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font-size:15px;color:#8b95a5;">
            <p style="margin:0 0 4px;"><strong style="color:#5b6777;">GitHub 每日盲盒</strong></p>
            <p style="margin:0 0 2px;">由 GitHub Actions 自动生成</p>
            <p style="margin:0;color:#a0abbc;">明日同一时间自动送达</p>
          </td>
          <td align="right" style="font-size:15px;color:#a0abbc;">${dateStr}</td>
        </tr>
      </table>
    </td></tr>

  </table>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;">
    <tr><td align="center" style="padding:16px 12px 32px;font-size:14px;color:#a0abbc;">本邮件由 GitHub Actions 自动发送，无需回复</td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

function escapeHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// -- Read input --------------------------------------------------------------

async function getDigestText() {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf('--file');
  if (fileIdx !== -1 && args[fileIdx + 1]) {
    return await readFile(args[fileIdx + 1], 'utf-8');
  }
  const chunks = [];
  for await (const chunk of process.stdin) { chunks.push(chunk); }
  return Buffer.concat(chunks).toString('utf-8');
}

function getArg(name) {
  const args = process.argv.slice(2);
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

// -- Main --------------------------------------------------------------------

async function main() {
  const toEmail = getArg('--to') || process.env.QQ_EMAIL;
  const subject = getArg('--subject');

  if (!toEmail) { console.error('Error: --to or QQ_EMAIL required'); process.exit(1); }

  const digestText = await getDigestText();
  if (!digestText || digestText.trim().length === 0) {
    console.log(JSON.stringify({ status: 'skipped', reason: 'Empty digest text' }));
    return;
  }

  loadEnv({ path: join(homedir(), '.follow-builders', '.env') });

  const smtpUser = process.env.QQ_EMAIL;
  const smtpPass = process.env.QQ_SMTP_AUTH_CODE;
  if (!smtpUser) { console.error('Error: QQ_EMAIL not found in .env'); process.exit(1); }
  if (!smtpPass) { console.error('Error: QQ_SMTP_AUTH_CODE not found in .env'); process.exit(1); }

  const transporter = createTransport({
    host: QQ_SMTP_HOST, port: QQ_SMTP_PORT, secure: true,
    auth: { user: smtpUser, pass: smtpPass }
  });

  const finalSubject = subject || `GitHub 每日盲盒 — ${new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  })}`;

  try {
    const emailHtml = buildEmailHtml(digestText, finalSubject);

    const info = await transporter.sendMail({
      from: `"GitHub 每日盲盒" <${smtpUser}>`,
      to: toEmail,
      subject: finalSubject,
      text: digestText,
      html: emailHtml
    });

    console.log(JSON.stringify({
      status: 'ok', method: 'email', messageId: info.messageId,
      to: toEmail, subject: finalSubject
    }));
  } catch (err) {
    console.error(JSON.stringify({ status: 'error', message: err.message }));
    process.exit(1);
  }
}

main();