# Frost Reaper — instrukcja GitHub + Tampermonkey

Repozytorium: https://github.com/marasko95/FrostReaper

## KROK 1 — utwórz repozytorium (raz)
1. Zaloguj się na https://github.com/ jako **marasko95**.
2. Otwórz https://github.com/new.
3. W polu **Repository name** wpisz dokładnie `FrostReaper`.
4. Wybierz **Public** (ważne: zwykły Tampermonkey nie pobierze plików z prywatnego repozytorium przez te adresy).
5. Kliknij **Create repository**.

## KROK 2 — wgraj pliki
1. W repozytorium kliknij **Add file → Upload files** (w pustym repo może być link **uploading an existing file**).
2. Rozpakuj ZIP na komputerze.
3. Przeciągnij **cztery pliki `.user.js`** do okna GitHuba:
   - `FrostReaper_Manager.user.js` — Manager **v0.3.7** z wbudowaną Ulepszarką;
   - `FrostReaper_TitanHelper.user.js` — TH **v0.5.35**;
   - `FrostReaper_AutoSkill.user.js` — AS **v2.5.3**;
   - `FrostReaper_KCS.user.js` — KCS **v0.2.1**.
4. Opcjonalnie dodaj ten plik `README.md`.
5. Upewnij się, że wrzucasz pliki do **głównego katalogu** repozytorium na gałęzi **main** (nie do folderu).
6. Kliknij **Commit changes**.

## KROK 3 — zainstaluj skrypty (raz)
1. Sprawdź, czy w Tampermonkey stare kopie Managera/TH/AS/KCS są wyłączone — unikaj dwóch działających kopii.
2. Otwórz w przeglądarce:
   https://raw.githubusercontent.com/marasko95/FrostReaper/main/FrostReaper_Manager.user.js
3. Tampermonkey powinien zaproponować instalację. Zatwierdź.
4. W grze w Managerze otwórz **Instaluj** i kliknij instalację TH, AS, KCS — otworzą się ich gotowe linki. Możesz też instalować je bezpośrednio z adresów poniżej.
5. Odśwież grę. **Ulepszarka jest już w Managerze**, nie instaluj jej osobno.

## KROK 4 — przyszłe aktualizacje
1. Przygotuj nowszą wersję pliku, np. Managera z `// @version 0.3.8`.
2. Na GitHubie otwórz odpowiedni plik i użyj edycji (ikona ołówka), wklej nową zawartość, a potem **Commit changes**; albo użyj Upload files i zastąp plik o tej samej nazwie.
3. Zachowaj **identyczną nazwę pliku** i adresy `@updateURL` / `@downloadURL`.
4. Tampermonkey okresowo sprawdza aktualizacje; można też w jego panelu uruchomić **Check for userscript updates / Sprawdź aktualizacje skryptów**.
5. Po aktualizacji odśwież grę.

**Ważne:** pliki muszą być opublikowane na GitHubie, żeby linki zadziałały. Sam ZIP nie publikuje niczego automatycznie. Każdy skrypt aktualizuje się osobno, gdy zwiększysz jego `@version`. Samo wrzucenie nowego pliku bez zmiany wersji może nie wywołać aktualizacji.

## Stałe adresy instalacji
- Manager: https://raw.githubusercontent.com/marasko95/FrostReaper/main/FrostReaper_Manager.user.js
- TitanHelper: https://raw.githubusercontent.com/marasko95/FrostReaper/main/FrostReaper_TitanHelper.user.js
- AutoSkill: https://raw.githubusercontent.com/marasko95/FrostReaper/main/FrostReaper_AutoSkill.user.js
- KCS: https://raw.githubusercontent.com/marasko95/FrostReaper/main/FrostReaper_KCS.user.js

## Uwaga o włączaniu/wyłączaniu
Przełączniki TH, AS i KCS w Managerze sterują **widocznością ich okien**, nie zatrzymują całej logiki dodatków. Ulepszarkę można wyłączyć z Managera. Pełne wyłączenie oddzielnych skryptów można zrobić w Tampermonkey.

## Testy
Sprawdzono składnię czterech plików komendą `node --check`. Nie przeprowadzono testów działania w samej grze.
