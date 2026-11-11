# A·CEIL — автоматичні листи після схвалення/відхилення реєстрації

Поточна авторизація: Supabase Auth (Google OAuth та email). Адміністратор змінює статус через RPC `admin_set_registration_status`; нова SQL-міграція ставить повідомлення в outbox тільки при **реальному переході** статусу `profiles.approval_status` на `approved` або `rejected`. Сам RPC не переписувати.

> **Не ввімкнено лише від merge GitHub.** Потрібно налаштувати Resend, розгорнути Edge Function, виконати міграцію Supabase й створити Database Webhook. Якщо статус зберігається не в `profiles.approval_status`, міграція безпечно зупиниться, щоб не змінювати іншу схему.

## 1. Пошта

1. У [Resend](https://resend.com/domains) додайте домен `a-ceil.pp.ua` і налаштуйте рекомендовані записи DNS (SPF/DKIM). Дочекайтеся статусу **Verified**.
2. Створіть Resend API key для надсилання пошти (надійно зберігайте, **ніколи не вставляйте його в GitHub, JS браузера чи чат**).
3. У Supabase → Edge Functions → Secrets встановіть:
   - `RESEND_API_KEY` — API-ключ Resend;
   - `ACEIL_MAIL_FROM` — `A·CEIL <noreply@a-ceil.pp.ua>` (домен має бути підтверджений).

Якщо бажаєте, `noreply` можна замінити на адресу, куди отримуватимете відповіді.

## 2. Функція Supabase

Supabase проєкт: `twuvpnxkfmpbzoprcgyd`.

Код: `supabase/functions/aceil-registration-mail/index.ts`.

Розгорніть функцію через Supabase CLI із кореня репозиторію:

```bash
npx supabase login
npx supabase link --project-ref twuvpnxkfmpbzoprcgyd
npx supabase functions deploy aceil-registration-mail --project-ref twuvpnxkfmpbzoprcgyd --no-verify-jwt
```

**Безпека:** для цього webhook-функціоналу `verify_jwt=false` — не помилка. Сам Edge Function використовує `withSupabase({auth:'secret'})`, і приймає тільки серверний ключ у заголовку `apikey`. Не ставте `auth:'none'`. Секрет не розміщуйте у фронтенді.

## 3. Міграція БД

У Supabase SQL Editor виконайте **весь** файл:

`supabase/migrations/20261111110000_registration_status_mail_outbox.sql`

У ньому є перевірка на `public.profiles.approval_status`, захищений журнал, атомарне блокування завдань, RPC для адміністратора та тригер реального переходу статусу. Якщо міграція зупинилася на перевірці колонки, **не обходьте перевірку** — потрібно прочитати реальне визначення `admin_set_registration_status` і адаптувати тригер.

## 4. Database Webhook (обов'язково)

У Supabase → Database → Webhooks → **Create a new hook**:

- Name: `aceil-registration-mail-insert`
- Table: `public.aceil_registration_mail_jobs`
- Event: **INSERT only**
- Type: **Supabase Edge Functions**
- Function: `aceil-registration-mail`
- Under HTTP Headers: **Add secret key** (Supabase secret API key, не publishable/anon key).

Webhook передає лише ідентифікатор завдання; Edge Function перечитує користувача і статус із Supabase через серверні права. Не додавайте webhook на UPDATE — це створить зайві виклики.

## 5. Перевірка

1. Створіть окремий тестовий акаунт з реальною адресою пошти.
2. Схваліть його в A·CEIL. У картці користувача має з'явитися `✉️ Лист передано поштовому сервісу`; перевірте inbox та spam.
3. Для іншого тестового акаунта перевірте відхилення та відповідний лист.
4. Натисніть «Надіслати ще раз» і переконайтеся, що після підтвердження створюється тільки один ручний запис.
5. Повторне натискання «Схвалити» без зміни статусу **не** повинно створити нового автоматичного запису.

Read-only SQL для діагностики (SQL Editor, роль postgres):

```sql
SELECT id, user_id, kind, source, status, attempts, created_at, sent_at, left(coalesce(last_error,''),160) AS error
FROM public.aceil_registration_mail_jobs
ORDER BY created_at DESC
LIMIT 20;
```

`sent` означає, що Resend **прийняв** лист для доставки. Це не гарантія потрапляння у Inbox; для доставленого/відхиленого листа потрібні Resend delivery webhooks.

## Відмовостійкість та обмеження

- One-time автоматичні `approved` і `rejected` на одного користувача, без дублювання при повторних RPC/вебхуках.
- Серверна функція атомарно забирає запис; використовує `Idempotency-Key` Resend.
- Помилки зберігаються в outbox, власник може свідомо повторно надіслати через адмінку.
- Після збою між прийняттям листа Resend і оновленням статусу БД автоматична повторна відправка **не** виконується, щоб не створити дублікати. Може знадобитися ручна перевірка в Resend.
- Міграція **не** розсилає листів існуючим активованим користувачам заднім числом.
- Це транзакційні листи про доступ до облікового запису, не маркетингові розсилки.
- У репозиторії немає секретів, і цей код сам не налаштовує зовнішній поштовий сервіс.
