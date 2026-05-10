# ValeBook Kullanım Kılavuzu 📘

ValeBook, otopark ve kafe vale işletmeleri için özel olarak tasarlanmış, profesyonel bir "Kasa ve Finans Yönetim" masaüstü uygulamasıdır. 

---

## 1. Kurulum ve İlk Açılış
Uygulama kurulum gerektirmez, doğrudan çalıştırılabilir bir formattadır.
1. İndirdiğiniz **`ValeBook.exe`** dosyasına çift tıklayın.
2. Uygulama otomatik olarak açılacaktır.
3. Uygulama her açıldığında internete (arka planda) bağlanır ve bir güncelleme varsa size uyarı verir. Ayarlar sayfasından manuel kontrol de yapabilirsiniz.

---

## 2. İlk Adım: Ayarlar Menüsü ⚙️
Uygulamayı kullanmaya başlamadan önce, sol menüden **"Ayarlar"** sekmesine girmelisiniz.
- **İşletme Adı:** Otoparkınızın veya kafenizin adını buraya yazın.
- **Banka POS Komisyon Oranı (%):** Kredi kartı ödemelerinden bankanın kestiği oranı girin (Örn: 1.5). Bu oran, sistem genelindeki tüm "Net Tutar" hesaplamalarında kullanılır.
- **Gider Kategorileri:** İşletmenizdeki masraf kalemlerini (Örn: Maaş, Kira, Mutfak) buradan yönetebilirsiniz.

---

## 3. Gelir Girişi ve Veri Güvenliği 💰
1. **Gelir Girişi:** Araç sayısını ve tutarı girin. POS ödemeleri sistemde "Beklemede" (Bankada) olarak işaretlenir.
2. **Konsolide Görünüm:** Aynı güne ait tüm girişleriniz tabloda **tek bir satır** olarak toplanır.
3. **Geri Al / İleri Al:** Bir hata yaptıysanız, "Kaydet" yanındaki ok tuşlarını kullanarak yaptığınız son işlemleri saniyeler içinde geri alabilirsiniz.

---

## 4. POS Yönetimi ve Banka Takibi (Mutabakat) 🏦
Bu ekran, bankadaki alacaklarınızı ve nakit akışınızı yönetmenizi sağlar.
1. **Tarih Filtresi:** Geçmişe dönük POS işlemlerini tarih aralığı seçerek listeleyebilirsiniz.
2. **Banka Tahsilatı Gir:** Banka hesabınıza para yattığında, bu tutarı kutucuğa yazıp "Tahsilatı Kaydet" butonuna basın.
3. **FIFO Mantığı:** Girdiğiniz tutar, en eski bekleyen POS işlemlerinden başlanarak otomatik olarak "Tahsil Edildi" olarak işaretlenir.
4. **Tahsilat Geri Al:** Hatalı bir tahsilat girişi yaptıysanız, "Son Tahsilatı Geri Al" butonu ile işlemi anında iptal edebilirsiniz.

---

## 5. Dashboard (Ana Ekran) 📊
İşletmenizin finansal sağlığını anlık olarak takip edin:
- **💵 Sıcak Nakit (Kasa):** Şu an elinizde olan gerçek paradır. (Nakit Girişleri + Bankadan Hesabınıza Geçen POS paraları - Harcamalar).
- **🏦 Bankada Bekleyen:** Henüz bankadan hesabınıza aktarılmamış alacaklarınızdır. Kartın altında **"Tahmini Kesinti"** notunu görebilirsiniz.
- **📈 Grafik:** Günlük araç girişi ve gelir trendinizi interaktif görsel grafikler üzerinde karşılaştırın.

---

## 6. Raporlama ve Excel Çıktısı 📉
- **Giderler:** Harcamalarınızı kategorilere göre girin. Giderleriniz "Sıcak Nakit" bakiyenizden otomatik olarak düşülür.
- **Detaylı Hareketler:** Rapor sayfasında her işlemin brüt tutarını, banka komisyonunu ve net elinize geçecek tutarı görebilirsiniz.
- **Excel:** Tüm raporları XLSX formatında dışa aktarabilirsiniz. Excel dosyasında komisyon hesaplamaları hazır olarak sunulur.

---

**Mutlu Kazançlar!** 🚀 (v1.1.34)
