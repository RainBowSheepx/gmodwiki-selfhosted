# Развёртывание GMod Wiki (self-hosted) на Windows

Инструкция для переноса вики (сайт + PostgreSQL-страницы + MCP) на другую Windows-машину,
где уже установлены **Node.js 20+** и **PostgreSQL** (сервис запущен).

---

## 1. Перенос проекта

Скопируйте папку проекта на новую машину (например, в `D:\gmodwiki`) **целиком, кроме `node_modules`**.

Обязательно должны попасть:

| Что | Зачем |
|---|---|
| `src`, `semantic`, `build`, `package.json`, `package-lock.json`, конфиги | код проекта |
| `dist\` | готовая сборка сайта (позволяет не скрейпить заново) |
| `public\` | скачанный контент официальной вики (6348 страниц, стили, картинки) |
| `build\cache\` | кеш скрейпа (нужен только для будущих пересборок/эмбеддингов — можно не копировать) |
| `db_backup\` | дамп базы (страницы документации) и скрипты импорта/экспорта |
| `trolleybus_system\` | аддон + генератор документации |

Затем в папке проекта:

```bash
npm ci
```

Если `npm ci` споткнётся на `sharp` (нужен только для пересборки контента, не для запуска):

```bash
npm install --force @img/sharp-win32-x64
```

## 2. PostgreSQL: пользователь и база

Откройте psql под суперпользователем (`psql -U postgres`) и выполните:

```sql
CREATE USER gmodwiki WITH PASSWORD 'gmodwiki';
CREATE DATABASE gmodwiki OWNER gmodwiki;
```

Пароль можно взять свой — тогда укажите его в `DATABASE_URL` (см. шаг 4).
Схему создавать не нужно: приложение (и скрипт импорта) создают таблицы сами.

## 3. Импорт страниц вики

В `db_backup\gmodwiki_data.json` лежит выгрузка всех custom-страниц (документация
троллейбусной системы и т.д.). Импорт (из корня проекта):

```bash
node db_backup/import_db.mjs
```

Скрипт идемпотентен (upsert) — можно запускать повторно.
Если `DATABASE_URL` нестандартный, задайте его перед запуском (см. шаг 4).

Альтернатива без дампа: после запуска сайта выполнить
`node trolleybus_system/docs_generator/run.mjs` — пересоздаст документацию аддона
через API вики (демо-страницы и ручные правки при этом не восстановятся).

Обратный экспорт (для бэкапов): `node db_backup/export_db.mjs`.

## 4. Запуск сервера

Из корня проекта (важно — рабочей директорией должен быть корень):

```powershell
$env:HOST = "127.0.0.1"
$env:PORT = "4321"
$env:DATABASE_URL = "postgres://gmodwiki:gmodwiki@localhost:5432/gmodwiki"
node dist\server\entry.mjs
```

Проверка: http://127.0.0.1:4321 — главная; `/custom` — custom-страницы;
`/Trolleybus_System` — документация аддона; `/mcp` — MCP endpoint (streamable HTTP).

Без доступной БД сайт работает, но custom-страницы недоступны.

### Контроль доступа (атрибуты гейта)

На каждый запрос сервер спрашивает внешний обработчик доступа:
`POST https://example.com/handler` с form-телом `type=HasAccessToWiki&ip=<ip клиента>`;
ответ `true` — пускаем, `false` — клиент получает 403. Настройки через переменные окружения:

| Переменная | Значение |
|---|---|
| `ACCESS_CHECK_URL` | URL обработчика (по умолчанию `https://example.com/handler`) |
| `ACCESS_CHECK_DISABLED=1` | полностью выключить проверку |
| `ACCESS_CHECK_FAIL_CLOSED=1` | при недоступности обработчика запрещать вход (по умолчанию — пропускать, чтобы вики не падала вместе с обработчиком) |

Вердикт кешируется на 60 секунд на каждый IP. За reverse-proxy клиентский IP берётся
из заголовка `X-Forwarded-For`.

## 5. Автозапуск (опционально)

Простой способ — Планировщик задач (от администратора):

```powershell
schtasks /Create /TN "gmodwiki" /SC ONSTART /RU SYSTEM /TR "cmd /c cd /d D:\gmodwiki && set HOST=127.0.0.1&& set PORT=4321&& set DATABASE_URL=postgres://gmodwiki:gmodwiki@localhost:5432/gmodwiki&& node dist\server\entry.mjs"
```

Либо оформить node-процесс как службу через [NSSM](https://nssm.cc)
(`nssm install gmodwiki "C:\Program Files\nodejs\node.exe" "dist\server\entry.mjs"`,
рабочая директория — корень проекта, переменные окружения — те же).

## 6. Доступ с других машин (опционально)

- `HOST=0.0.0.0` вместо `127.0.0.1`;
- открыть порт: `netsh advfirewall firewall add rule name="gmodwiki" dir=in action=allow protocol=TCP localport=4321`;
- наружу лучше выставлять через reverse-proxy (nginx/caddy) с TLS.

## 7. Обновление контента с официальной вики

Официальные страницы — статические файлы, пересобираются скрейпом; custom-страницы
живут в PostgreSQL и обновлением не затрагиваются.

```powershell
npm run build        # скрейп wiki.facepunch.com (~30-60 мин; кеш ускоряет повторы)
npm run astrobuild   # сборка сайта
# перезапустить сервер
```

Для быстрых тестовых сборок: `$env:PAGE_LIMIT="250"` (только N страниц) и
`$env:SKIP_EMBEDDINGS="1"` (пропустить эмбеддинги).

## 8. Семантический поиск (опционально)

Текущая сборка работает с keyword-поиском. Чтобы включить семантический поиск,
на машине с `build\cache`:

```powershell
npm run embeddings   # первая генерация долгая (CPU) + скачает модель ~30 МБ
npm run astrobuild
```

## 9. Подключение MCP к ИИ-агентам

```bash
claude mcp add --transport http gmodwiki http://<хост>:4321/mcp
```

Инструменты: `search_wiki`, `get_page` (видят и custom-страницы).
