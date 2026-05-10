# ValeBook Kullanım Kılavuzu 📘

ValeBook, otopark ve kafe vale işletmeleri için özel olarak tasarlanmış, profesyonel bir "Kasa ve Finans Yönetim" masaüstü uygulamasıdır. 

---

## 1. Kurulum ve İlk Açılış
Uygulama kurulum gerektirmez, doğrudan çalıştırılabilir bir formattadır.
1. İndirdiğiniz **`ValeBook_Setup.exe`** dosyasına çift tıklayın.
2. Uygulama otomatik olarak kurulup **tam ekran** olarak açılacaktır.
3. Uygulama her açıldığında internete (arka planda) bağlanır ve bir güncelleme varsa size uyarı verir. (Eğer internet yoksa da sorunsuz bir şekilde çalışmaya devam eder).

---

## 2. İlk Adım: Ayarlar Menüsü ⚙️
Uygulamayı kullanmaya başlamadan önce, sol menüden **"Ayarlar"** sekmesine girmelisiniz.
- **İşletme Adı:** Otoparkınızın veya kafenizin adını buraya yazın.
- **Banka POS Komisyon Oranı (%):** Kredi kartı ödemelerinden bankanın kestiği oranı girin (Örn: 1.5). Bu oran, POS Takibi ekranında alacağınızı otomatik hesaplamak için kullanılır.
- **Gider Kategorileri:** İşletmenizdeki masraf kalemlerini (Örn: Maaş, Kira, Mutfak) buradan yönetebilirsiniz.

---

## 3. Gelir Girişi ve Veri Güvenliği 💰
1. **Gelir Girişi:** Araç sayısını ve tutarı girin. POS ödemeleri sistemde "Beklemede" (Bankada) olarak işaretlenir.
2. **Konsolide Görünüm:** Aynı güne ait tüm girişleriniz tabloda **tek bir satır** olarak toplanır. Böylece karmaşık bir liste yerine derli toplu bir günlük özet görürsünüz.
3. **Geri Al / İleri Al:** Bir hata yaptıysanız, "Kaydet" yanındaki ok tuşlarını kullanarak yaptığınız son 5 işlemi geri alabilir veya ileri alabilirsiniz. Verileriniz asla kaybolmaz!

---

## 4. POS Yönetimi ve Banka Takibi (Mutabakat) 🏦
Bu ekran, bankadaki alacaklarınızı ve harcanabilir nakit akışınızı yönetmenizi sağlar.
1. **Banka Tahsilatı Gir:** Banka hesabınıza para yattığında (Örn: 5000 TL), bu tutarı kutucuğa yazıp "Tahsilatı Kaydet" butonuna basın.
2. **FIFO (İlk Giren İlk Çıkar):** Girdiğiniz tutar, en eski bekleyen POS işlemlerinden başlanarak otomatik olarak "Tahsil Edildi" olarak işaretlenir.
3. **Kısmi Tahsilat:** Eğer bankadan gelen tutar o günkü POS toplamından azsa, o gün "Kısmi" olarak işaretlenir ve sistem size **"Daha [X] TL gelecek alacağınız var"** bilgisini net olarak gösterir.
4. **Bakiye Kontrolü:** "Toplam Bekleyen (Brüt)", "Tahsil Edilen" ve "Kalan Alacak (Net)" değerlerini anlık olarak takip edebilirsiniz.

---

## 5. Dashboard (Ana Ekran) 📊
İşletmenizin finansal sağlığını anlık olarak takip edin:
- **💵 Sıcak Nakit (Kasa):** Şu an elinizde olan gerçek paradır. (Nakit Girişleri + Bankadan Hesabınıza Geçen POS paraları - Harcamalar).
- **🏦 Bankada Bekleyen:** Henüz bankadan hesabınıza aktarılmamış, gelecek olan alacaklarınızdır.
- **📈 Trend Grafiği:** Haftalık nakit ve kart gelirlerinizi interaktif bir grafik üzerinde karşılaştırın.

---

## 6. Gider Girişi ve Raporlama 📉
- **Giderler:** Harcamalarınızı kategorilere göre girin. Giderleriniz "Sıcak Nakit" bakiyenizden otomatik olarak düşülür.
- **Raporlar:** İstediğiniz tarih aralığını seçin. Rapor sayfasında hem kategorilere göre **Özet Dağılımı** hem de tüm harcamaların tek tek listelendiği **Detaylı İşlem Hareketleri** tablosunu görebilirsiniz.
- **Excel:** Excel (XLSX) çıktısı ile tüm bu verileri muhasebecinize gönderebilirsiniz.

---

## 7. Uygulamayı Güncelleme 🔄
Uygulama açılışta güncellemeleri otomatik kontrol eder. Veya manuel olarak **Ayarlar** sayfasının altındaki **Güncellemeleri Kontrol Et** butonunu kullanabilirsiniz.

---
**Mutlu Kazançlar!** 🚀
