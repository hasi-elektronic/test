# Renkli Bahçe Çiçekçilik

Bu repo statik bir site içerir ve GitHub Pages ile kolayca yayınlanır.

## Proje Yapısı
- `index.html` → ana site (repo kökü)
- `docs/index.html` → GitHub Pages için yayın dosyası
- `404.html` → fallback sayfası
- `.nojekyll` → Pages'te Jekyll devre dışı

## 1) GitHub'a gönder (push)
Aşağıdaki komutları kendi repo URL'in ile çalıştır:

```bash
git init
git add .
git commit -m "İlk yayın"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADI/REPO_ADI.git
git push -u origin main
```

> Eğer remote zaten varsa, `git remote add origin ...` yerine gerekirse:
> `git remote set-url origin https://github.com/KULLANICI_ADI/REPO_ADI.git`

## 2) GitHub Pages ayarını aç
GitHub repo sayfasında:

1. **Settings**
2. **Pages**
3. **Build and deployment** bölümünde:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/docs**
4. **Save**

## 3) Yayın linki
Yayın URL'i genelde şu formatta olur:

```text
https://KULLANICI_ADI.github.io/REPO_ADI/
```

> Not: Site ilk açılışta 1-5 dakika sürebilir.

## 4) Doğru URL kontrolü (en sık hata)
Eğer "Not Found" görürsen çoğu zaman sebep yanlış URL'dir.

- ✅ Doğru (project pages): `https://KULLANICI_ADI.github.io/REPO_ADI/`
- ❌ Yanlış: `https://KULLANICI_ADI.github.io/`

## 5) Yerelde test
```bash
python3 -m http.server 8000
```

Aç:
- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/docs/`

## 6) Güncelleme yayınlama
Dosyalarda değişiklik yaptıktan sonra:

```bash
git add .
git commit -m "Site güncellemesi"
git push
```

GitHub Pages otomatik yeniden deploy eder.
