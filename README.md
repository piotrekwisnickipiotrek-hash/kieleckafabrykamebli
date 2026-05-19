# KieleckaFabrykaMebli.pl - notatnik pracownikow

Prosta aplikacja webowa dla zespolu:

- przy pierwszym wejsciu pracownik podaje imie i nazwisko,
- przegladarka zapamietuje pracownika na kolejne wizyty,
- wszyscy widza wspolne notatki i zapytania klientow,
- przy kazdym wpisie widac, kto go dodal i kto ostatnio edytowal,
- dane zapisuja sie lokalnie w `data/db.json`.

## Uruchomienie

```bash
npm start
```

Potem wejdz w przegladarce na:

```text
http://localhost:3000
```

## Wdrozenie na VPS

Na serwerze z Ubuntu najprostsza sciezka to Docker + Nginx:

```bash
docker compose up -d --build
```

Aplikacja bedzie wtedy dzialac lokalnie na serwerze pod portem `3000`.

Plik `nginx-kieleckafabrykamebli.conf` jest gotowa konfiguracja reverse proxy dla:

```text
kieleckafabrykamebli.pl
www.kieleckafabrykamebli.pl
```

Po skopiowaniu jej do Nginx trzeba jeszcze ustawic rekordy DNS domeny na adres IP serwera i wlaczyc certyfikat SSL, np. przez Let's Encrypt:

```bash
sudo certbot --nginx -d kieleckafabrykamebli.pl -d www.kieleckafabrykamebli.pl
```

Wazne: folder `data` jest montowany jako volume w `docker-compose.yml`, dzieki czemu notatki zostaja po restarcie kontenera.

Jesli inni pracownicy maja wejsc z innych komputerow w tej samej sieci, uruchom aplikacje na jednym komputerze i podaj im adres tego komputera, np.:

```text
http://ADRES-IP-KOMPUTERA:3000
```

## Pliki

- `server.js` - serwer i API zapisu danych,
- `public/index.html` - struktura strony,
- `public/styles.css` - wyglad aplikacji,
- `public/app.js` - logika interfejsu,
- `data/db.json` - zapisane notatki i klienci.
