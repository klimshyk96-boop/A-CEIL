# A·CEIL — безкоштовна пошта через окремий Gmail (SMTP)

Для A·CEIL існує повноцінна черга повідомлень у Supabase (`public.aceil_registration_mail_jobs`) і Edge Function `aceil-registration-mail`. Google Apps Script **не потрібен**: простіше використати Gmail SMTP `smtp.gmail.com:465` (TLS) через Nodemailer.

Ця інструкція стосується **тільки A·CEIL**. Не використовувати домен/акаунти «Ваша стеля».

## Що власник робить один раз

1. Створити **окремий** обліковий запис Gmail для A·CEIL, наприклад `aceil.notifications@gmail.com`, якщо доступний. Адресу потрібно створити реально (приклад не означає, що її зареєстровано).
2. У Google Account → Security увімкнути **2-Step Verification** для цієї пошти.
3. Перейти до [App passwords](https://myaccount.google.com/apppasswords), створити пароль застосунку з назвою `A CEIL Supabase`. Google покаже окремий 16-символьний пароль.
4. На сторінці [Supabase → Edge Functions → Secrets](https://supabase.com/dashboard/project/twuvpnxkfmpbzoprcgyd/functions/secrets) додати:
   - `ACEIL_GMAIL_ADDRESS` = створена повна адреса Gmail;
   - `ACEIL_GMAIL_APP_PASSWORD` = 16-символьний **пароль застосунку** (не звичайний пароль Gmail!).
5. **Ніколи не надсилати пароль у чат, GitHub, скриншотах та публічних файлах**. Зберігати лише в Secrets Supabase. За потреби створити новий app password і відкликати старий у Google.

Якщо Google не пропонує App passwords (зокрема через Advanced Protection), доведеться використовувати OAuth/Gmail API або Apps Script замість SMTP.

## Які функції вже є

- `admin_set_registration_status` без змін схвалює або відхиляє акаунт.
- Тригер `aceil_registration_mail_on_status_change` створює повідомлення в черзі **лише при реальній зміні статусу**.
- `aceil-registration-mail` забирає завдання через `aceil_mail_claim`, отримує адресу з Supabase Auth, надсилає лист, фіксує статус і Message-ID.
- У картці користувача є статус листа й можливість повторного відправлення.
- Gmail вибирається автоматично, якщо є `ACEIL_GMAIL_ADDRESS` / `ACEIL_GMAIL_APP_PASSWORD`. Інакше зберігається резервний шлях Resend.
- У листах Gmail відправник показується як `A·CEIL <створений-акаунт@gmail.com>`; видавати без підтвердженого домену адресу `@a-ceil.pp.ua` не можна.

## Що ще потрібно перед реальним надсиланням

**Важливо:** код та міграція самі по собі не активують доставку. У Supabase Database → Webhooks створити webhook:

- Name: `aceil-registration-mail-insert`
- Table: `public.aceil_registration_mail_jobs`
- Event: **INSERT**
- Destination: Supabase Edge Function **`aceil-registration-mail`**
- HTTP Header: `apikey` із **Supabase Secret API Key**. Не передавати `Authorization: Bearer <sb_secret_...>`, оскільки це не JWT. Зберігати секрет захищено. Код функції використовує `withSupabase({ auth: "secret" })`, навіть якщо для Edge gateway `verify_jwt = false`.

Замість ручного webhook можна реалізувати захищений SQL pg_net + Vault; **без секрету та webhook нічого не надсилатиметься автоматично**. Не додавати загальнодоступну анонімну точку виклику.

## Тест

Створити тестового користувача, схвалити його в адмінці, перевірити пошту, журнал у Supabase й Google Gmail → Надіслані. Для іншого тестового акаунта перевірити відхилення.

```sql
SELECT kind, source, status, attempts, created_at, sent_at, left(coalesce(last_error,''),160) AS error
FROM public.aceil_registration_mail_jobs
ORDER BY created_at DESC
LIMIT 20;
```

Якщо статус `sent`, SMTP-сервер прийняв повідомлення, але це ще не гарантія доставки в Inbox.

## Обмеження

Gmail SMTP — компромісне стартове рішення для невеликої кількості транзакційних повідомлень, не для масової розсилки. Google може обмежувати швидкість та денну кількість, новий акаунт може мати суворіші ліміти. Для відправлення з власного домену згодом краще використовувати транзакційний сервіс із підтвердженим доменом.

Джерела:
- https://support.google.com/accounts/answer/185833 (App passwords)
- https://developers.google.com/workspace/gmail/imap/imap-smtp (SMTP 465 TLS)
- https://github.com/supabase/supabase/tree/master/examples/edge-functions/supabase/functions/send-email-smtp (Supabase Nodemailer приклад)
