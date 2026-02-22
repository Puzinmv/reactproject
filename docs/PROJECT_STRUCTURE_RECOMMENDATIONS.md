# Аудит структуры проекта и обновлённые рекомендации по архитектуре

## Короткий ответ на вопрос

Текущий предложенный вариант (`app/pages/features/shared/services`) **частично подходит**, но в вашем случае его нужно расширить под **платформу из нескольких независимых приложений**.

Почему:

- У вас уже есть несколько отдельных приложений (`App`, `GradeApp`, `AnalyticsApp`, `AIChat`, `AnketaKII`).
- Количество приложений будет расти.
- Для разных приложений могут быть **разные политики авторизации** (без авторизации / `AuthWrapper` / другой UI логина).

Если оставить «просто pages/features», есть риск, что логика конкретных приложений снова смешается в общих папках.

## Что есть сейчас

Плюсы:

- Есть базовое разделение на `pages`, `Components`, `services`, `hooks`, `context`, `styles`.

Проблемы:

1. **Смешение уровней абстракции в `src/Components`**
   - В одной папке и базовый UI, и доменные блоки.
2. **Нейминг не унифицирован**
   - `Components` vs lower-case папки; `1c.js` как специальный случай.
3. **Много app-entry на одном уровне (`App.js`, `GradeApp.js`, `AnalyticsApp.js`)**
   - Неочевидно, где «shell», где отдельные приложения.
4. **Авторизация не описана как политика приложения**
   - Сейчас `AuthWrapper` воспринимается как общий механизм, но в будущем будет несколько вариантов auth UX.

## Рекомендуемая целевая структура (для multi-app)

```text
src/
  platform/                     # инфраструктура платформы (общая для всех приложений)
    bootstrap/
      index.js                  # единая точка старта
      appRegistry.js            # реестр доступных приложений
    routing/
      rootRouter.js
    auth/
      guards/                   # RequireAuth, OptionalAuth, NoAuth
      providers/                # cookie/jwt/sso и т.п.
      ui/                       # базовые auth-компоненты платформы

  apps/                         # независимые приложения (вертикальными срезами)
    main/
      index.jsx
      routes.js
      config.js                 # метаданные приложения (title, authPolicy)
      pages/
      features/
      components/
    grade/
      index.jsx
      routes.js
      config.js
      pages/
      features/
    analytics/
      index.jsx
      routes.js
      config.js
      pages/
      features/
    ai-chat/
      index.jsx
      routes.js
      config.js
      pages/
      features/
    anketa-kii/
      index.jsx
      routes.js
      config.js
      pages/
      features/

  shared/                       # переиспользуемое между apps
    ui/
    hooks/
    lib/
    constants/
    styles/

  services/                     # клиенты внешних API
    api/
      directus.js
      openproject.js
      openrouter.js
      oneC.js
      deepseek.js

  tests/
```

## Ключевая идея: реестр приложений + auth policy на уровне app

Для каждого приложения хранить конфигурацию в `apps/<app>/config.js`, например:

- `id`, `title`, `basePath`
- `authPolicy`: `none | required | custom`
- `authRenderer` (опционально) — кастомный UI логина для конкретного app

Тогда добавление нового приложения = добавить папку в `apps/` + зарегистрировать в `platform/bootstrap/appRegistry.js`.

Это снимает жёсткую привязку ко `AuthWrapper` как единственному сценарию.

## Как связать с текущим `AuthWrapper`

`AuthWrapper` можно оставить как реализацию политики `required` по умолчанию:

- `none` → рендер без auth
- `required` → использовать текущий `AuthWrapper`
- `custom` → использовать app-specific auth flow/UI

Таким образом, текущий код не ломается, но архитектура уже готова к разным сценариям входа.

## План миграции без «большого взрыва»

### Этап 1 (безопасный): инфраструктура multi-app

- Создать `src/platform/bootstrap/appRegistry.js`.
- Описать существующие приложения в реестре.
- Добавить поле `authPolicy` для каждого.

### Этап 2: перенос entrypoint'ов в `apps/*`

- `App.js` → `apps/main/index.jsx`
- `GradeApp.js` → `apps/grade/index.jsx`
- `AnalyticsApp.js` → `apps/analytics/index.jsx`
- `pages/AIChat.js` и `pages/AnketaKII.js` оформить как части соответствующих `apps/*`.

### Этап 3: нормализация shared-кода

- `src/Components` разделить на:
  - `shared/ui` (чисто переиспользуемые компоненты)
  - `apps/*/components` (app-specific)
- Переименовать `1c.js` → `oneC.js`.

### Этап 4: тестирование по слоям

- Unit: `shared` и `apps/*/features`.
- Integration/smoke: маршрутизация и auth policy для каждого приложения.

## Практические правила для новых приложений

1. Любое новое приложение создаётся только в `src/apps/<new-app>`.
2. У каждого приложения обязателен `config.js` с `authPolicy`.
3. Запрещён прямой импорт app-specific кода из одного приложения в другое.
4. Общее переиспользование — только через `shared` или `services`.

## Definition of Done для структурного рефакторинга

- Новое приложение подключается через реестр, без изменения core-логики роутера.
- Для каждого приложения явно задана auth policy.
- `AuthWrapper` остаётся как default-механизм, но не единственный.
- Нет смешения shared и app-specific компонентов.
- CI проходит после каждого шага миграции.
