# Renkli Bahçe Çiçekçilik

Site dosyası iki yerde bulunur:
- `index.html` (repo kökü)
- `docs/index.html` (GitHub Pages için)

## Hızlı Açma
Tarayıcıda doğrudan `index.html` açılabilir.

## Yerelde Çalıştırma
```bash
python3 -m http.server 8000
```
Ardından:
- http://127.0.0.1:8000/
- http://127.0.0.1:8000/docs/

## Not Found sorununa karşı
- `404.html` dosyası eklendi (GitHub Pages fallback).
- `.nojekyll` eklendi.
