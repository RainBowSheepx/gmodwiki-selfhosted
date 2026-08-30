# GMod Wiki — self-hosted вики с документацией Trolleybus System

Форк [CFC-Servers/gmodwiki](https://github.com/CFC-Servers/gmodwiki), полностью избавленный от Cloudflare и расширенный:

- **Self-hosted**: Node.js или Docker, никаких облачных сервисов
- **Зеркало официальной вики** Garry's Mod (6300+ страниц, обновляется скрейпом)
- **Custom-страницы в PostgreSQL**: свои функции/классы/хуки с рендером разметки Facepunch (`<function>`, `<example>`, …) и markdown — редактируются в браузере, официальные страницы read-only (обновления с wiki.facepunch.com никогда не конфликтуют)
- **Документация аддона Trolleybus System**: 547 страниц (библиотека, классы, 19 систем, entity, 28 хуков, информаторы) + генератор в `trolleybus_system/docs_generator`
- **MCP-сервер** на `/mcp` (streamable HTTP) для ИИ-агентов
- **Интеграция с VS Code**: эндпоинт `/gluadump.json` отдаёт документацию в формате плагина [vscode-glua-enhanced](https://github.com/WilliamVenner/vscode-glua-enhanced) (наш форк) — автодополнение/hover/сигнатуры с авто-обновлением

---

## Быстрый старт на Windows (Node.js + PostgreSQL)

Требуется: **Node.js 20+**, **PostgreSQL 14+** (запущенный), git.

### 1. Установка зависимостей

```powershell
npm ci
# при проблемах со sharp (нужен только для пересборки контента):
npm install --force @img/sharp-win32-x64
```

### 2. База данных

В psql под суперпользователем (`psql -U postgres`):

```sql
CREATE USER gmodwiki WITH PASSWORD 'gmodwiki';
CREATE DATABASE gmodwiki OWNER gmodwiki;
```

Таблицы создавать не нужно — схема создаётся автоматически при первом обращении.
Свой пароль/хост — через `DATABASE_URL` (см. ниже).

Импорт готовой документации (547 страниц Trolleybus System из `db_backup/`):

```powershell
node db_backup/import_db.mjs
```

Скрипт идемпотентен (upsert), запускать можно повторно. Обратный экспорт: `node db_backup/export_db.mjs`.

> Если PostgreSQL не установлен и ставить его не хочется, для локальной разработки
> подойдёт [embedded-postgres](https://www.npmjs.com/package/embedded-postgres) —
> обычный user-процесс без службы и прав администратора.

### 3. Сборка контента официальной вики

```powershell
$env:SKIP_EMBEDDINGS="1"   # пропустить семантический поиск (быстрее; поиск будет keyword-only)
npm run build              # скрейп wiki.facepunch.com, ~30-60 минут
npm run astrobuild         # сборка сайта в dist/
```

Для быстрой тестовой сборки: `$env:PAGE_LIMIT="250"` (только 250 страниц).
Если папки `public/` и `dist/` уже перенесены с другой машины — этот шаг не нужен.

### 4. Запуск

Из корня проекта (важно — рабочая директория должна быть корнем):

```powershell
$env:HOST = "127.0.0.1"
$env:PORT = "4321"
$env:DATABASE_URL = "postgres://gmodwiki:gmodwiki@localhost:5432/gmodwiki"
node dist\server\entry.mjs
```

Проверка:
- http://127.0.0.1:4321 — вики;
- `/Trolleybus_System` — документация аддона;
- `/custom` — управление custom-страницами;
- `/gluadump.json` — дамп для VS Code-плагина;
- `/mcp` — MCP endpoint.

Автозапуск, файрвол, обновление контента — в [DEPLOY-WINDOWS.md](DEPLOY-WINDOWS.md).

---

## Запуск в Docker

```sh
docker compose up -d
```

Поднимает контейнер вики + `postgres:16-alpine` (данные в volume `gmodwiki_pgdata`,
схема создаётся сама). Настройки — через `.env`:

```env
GMODWIKI_HOST=127.0.0.1
GMODWIKI_PORT=4321
GMODWIKI_DB_PASSWORD=change-me
```

Образ собирает контент при `docker build` (полный скрейп). Импорт документации
внутрь compose-базы: `DATABASE_URL=postgres://gmodwiki:<пароль>@localhost:5432/gmodwiki node db_backup/import_db.mjs`
(проброс порта 5432 или выполнение изнутри сети compose).

---

## Связка с VS Code-плагином

Используется наш форк **vscode-glua-enhanced** (репозиторий рядом с этим).

1. Соберите/установите плагин (см. README/BUILD.md в его репозитории):
   ```sh
   code --install-extension vscode-glua-enhanced-2.6.3.vsix
   ```
2. В настройках VS Code (`GLua Enhanced`):
   - `glua-enhanced.customWiki.url` = адрес вики (по умолчанию `http://127.0.0.1:4321`)
   - `glua-enhanced.customWiki.pollSeconds` = период проверки обновлений (по умолчанию 60)
3. Плагин скачивает `/gluadump.json` и добавляет к официальному API всё, что
   задокументировано на вики: `Trolleybus_System.*` (включая вложенные библиотеки),
   методы классов (`Trolleybus:*`, системы, entity), хуки `TrolleybusSystem_*`
   в `hook.Add(`/`hook.Call(`, имена событий в `Trolleybus_System.RunEvent("` /
   `RunChangeEvent("` (без приставок/суффиксов). При изменении страниц на вики
   плагин подхватывает их автоматически, без перезапуска VS Code.

---

## Custom-страницы

- `/custom` — список категорий/страниц, создание, удаление (каскадное для категорий);
- `/custom/edit` — редактор с live-превью; разметка Facepunch + markdown;
- категории вкладываются через `/` в имени (`Trolleybus System/Systems`);
- страница с адресом, совпадающим с путём/именем категории, становится её
  «заголовком» в сайдбаре (как классы на официальной вики);
- у `<function>` есть атрибуты `github="…"` (куда ведёт Search Github) и
  `parentlink="…"` (адрес страницы родителя, если отличается от имени);
- авторизации нет — редактировать может любой посетитель.

### Генератор документации Trolleybus System

`trolleybus_system/docs_generator/` — источник правды для всех страниц документации:

```sh
node trolleybus_system/docs_generator/run.mjs
```

Идемпотентно публикует страницы через API вики (создаёт/обновляет). Сигнатуры
методов извлекаются из исходников аддона (`extract_sigs.mjs` → `signatures.json`),
ссылки View Source (файл + строки) строятся по ним же (`sourcemap.mjs`).

Исходники аддона генератор находит сам: переменная окружения `TROLLEYBUS_SRC`
(путь к распакованному аддону с папкой `lua/` внутри) → локальная копия в
`trolleybus_system/Garry-s-Mod-Trolleybus-System-master` → иначе архив master
скачивается с GitHub и распаковывается туда автоматически. Целевая вики задаётся
переменной `WIKI_BASE` (по умолчанию `http://127.0.0.1:4321`).

---

## MCP для ИИ-агентов

```sh
claude mcp add --transport http gmodwiki http://127.0.0.1:4321/mcp
```

Инструменты `search_wiki` (гибридный поиск) и `get_page` — видят и custom-страницы.

---

## Обновление официального контента

```powershell
npm run build && npm run astrobuild   # и перезапустить сервер
```

Custom-страницы живут в PostgreSQL и обновлением не затрагиваются; занять адрес
официальной страницы custom-страницей нельзя.

## Тесты

```sh
npm test   # 52 теста, включая байт-точное сравнение рендера с официальной вики
```
