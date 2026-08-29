# RC11 — language switch fix

Base: RC10 CLEANUP.

## Fixed
- Restored the missing canonical i18n core `js/projects/013-aceil-i18n-core.js` from the last known working CLEAN FINAL build.
- Restored its `<script>` load in block #013, before UK/EN/PL dictionaries (#014–#016).
- No other runtime code or UI/CSS was changed.

## Root cause
The language dictionaries and switcher were still present, but the i18n core that creates `A·CEIL.i18n` had disappeared. Therefore dictionary registration returned early and the language switcher had no `setLanguage()` API to call.
