# ValeBook — Vale Kasa Yönetim Uygulaması

Bu uygulama, cafe vale işletmeleri için günlük gelir ve gider takibi yapmak amacıyla geliştirilmiştir.

## Özellikler
- ✅ Günlük araç girişi ve gelir kaydı (Konsolide görünüm)
- ✅ Nakit ve POS (Kredi Kartı) ayrımı + Banka Komisyon hesaplama
- ✅ **POS Likidite Takibi:** Bankada bekleyen paraları "Tahsil Edildi" olarak işaretleme
- ✅ **Kasa Yönetimi:** Sıcak nakit (Eldeki) ve Bankadaki parayı ayrı görebilme
- ✅ Gider yönetimi ve kategori bazlı takip
- ✅ Kar-Zarar analizi ve aylık raporlar
- ✅ Excel'e aktarım desteği
- ✅ Otomatik güncelleme kontrolü

## Kurulum
1. [Node.js](https://nodejs.org/) (LTS versiyon) yükleyin.
2. Proje klasöründe `npm install` komutunu çalıştırın.
3. `create-shortcut.bat` dosyasına çift tıklayarak masaüstü kısayolu oluşturun.
*(Not: Eğer v1.0.1+ Electron sürümünü '.exe' kurulum dosyası olarak kullanıyorsanız bu adımlara gerek yoktur, doğrudan inen Setup dosyasını çift tıklayıp kurun)*

## Kullanım
- Masaüstündeki **ValeBook** kısayoluna çift tıklayın.
- **Gelir Girişi:** Günlük girişleri yapın. POS ödemeleri "Bankada Bekleyen" olarak kaydedilir.
- **POS Yönetimi:** Banka hesabınıza geçen paraları buradan onaylayarak "Kasa"nıza aktarın.
- **Dashboard:** "Kasada Nakit" kısmından anlık harcanabilir bakiyenizi takip edin.
