const data = [
  {
    name: "Cagayan",
    municipalities: [
      { name: "Tuguegarao City", barangays: ["Annafunan East", "Caggay", "Centro", "Pengue-Ruyu", "Ugac Norte"] },
      { name: "Abulug", barangays: ["Centro", "Cagoran", "Libertad", "Santa Rosa", "Tanglag"] },
      { name: "Alcala", barangays: ["Centro", "Afusing Bato", "Baquiag", "Macanao", "Pared"] },
      { name: "Allacapan", barangays: ["Centro", "Bessang", "Binalan", "Calog Norte", "Malumin"] },
      { name: "Amulung", barangays: ["Poblacion", "Bacayan", "Cusitan", "Gadu", "Mabuno"] },
      { name: "Aparri", barangays: ["Centro", "Macanaya", "Calaoagan", "Navagan", "San Antonio"] },
      { name: "Baggao", barangays: ["Poblacion", "Afusing", "Bangag", "Dalaoig", "Reyes"] },
      { name: "Ballesteros", barangays: ["Poblacion", "Ammubuan", "Cagoran", "Palloc", "Zitanga"] },
      { name: "Buguey", barangays: ["Poblacion", "Cabayu", "Lal-lo", "Minanga", "Santa Isabel"] },
      { name: "Calayan", barangays: ["Centro", "Babuyan Claro", "Dadao", "Dilam", "Magsidel"] },
      { name: "Camalaniugan", barangays: ["Centro", "Dugo", "Fugu", "Minanga", "Sapping"] },
      { name: "Claveria", barangays: ["Centro", "Alicaocao", "Culao", "Taggat Norte", "Taggat Sur"] },
      { name: "Enrile", barangays: ["Poblacion", "Batu", "Divisoria", "Lanna", "Mangalindan"] },
      { name: "Gattaran", barangays: ["Centro", "Barangay I", "Bolos Point", "Nassipping", "San Vicente"] },
      { name: "Gonzaga", barangays: ["Poblacion", "Batangan", "Calayan", "Flourishing", "Smart"] },
      { name: "Iguig", barangays: ["Poblacion", "Atulu", "Bayo", "Gammad", "San Lorenzo"] },
      { name: "Lal-lo", barangays: ["Poblacion", "Bangag", "Dalaoig", "Maxingal", "San Juan"] },
      { name: "Lasam", barangays: ["Centro", "Callao", "Nabannagan East", "Nabannagan West", "Sicalao"] },
      { name: "Pamplona", barangays: ["Centro", "Alloy", "Cacalaggan", "San Juan", "Santa Cruz"] },
      { name: "Peñablanca", barangays: ["Centro", "Aggugaddah", "Buyun", "Cabasan", "Lapi"] },
      { name: "Piat", barangays: ["Poblacion", "Apayao", "Calaoagan", "Maguilling", "Villa Rey"] },
      { name: "Rizal", barangays: ["Poblacion", "Angang", "Batul", "Mabuno", "Odoc"] },
      { name: "Sanchez-Mira", barangays: ["Centro", "Dacal", "Langagan", "Namuac", "Tokitok"] },
      { name: "Santa Ana", barangays: ["Centro", "Casambalangan", "Gattaran", "Palaui", "San Vicente"] },
      { name: "Santa Praxedes", barangays: ["Centro", "Cadongdongan", "Kalusutan", "Lat-ogan", "Macatel"] },
      { name: "Santa Teresita", barangays: ["Centro", "Alintugag", "Bangan", "Caniugan", "Pata"] },
      { name: "Santo Niño", barangays: ["Poblacion", "Balanni", "Cabaritan", "Mabuttal East", "Simbol"] },
      { name: "Solana", barangays: ["Centro", "Annabuculan", "Bangag", "Lannig", "Iraga"] },
      { name: "Tuao", barangays: ["Centro", "Accusilian", "Bagumbayan", "Mabbalat", "Palca"] }
    ]
  },
  {
    name: "Camarines Norte",
    municipalities: [
      { name: "Daet", barangays: ["Poblacion", "Bagasbas", "Lag-on", "Mancruz", "Pamorangon"] },
      { name: "Basud", barangays: ["Poblacion", "Angas", "Caayunan", "Langga", "Tuaca"] },
      { name: "Capalonga", barangays: ["Poblacion", "Alayao", "Itok", "Mataleo", "Tanawan"] },
      { name: "Jose Panganiban", barangays: ["Poblacion", "Bagong Bayan", "Calero", "Larap", "Osmeña"] },
      { name: "Labo", barangays: ["Poblacion", "Anahaw", "Bagong Silang", "Calabasa", "Talobatib"] },
      { name: "Mercedes", barangays: ["Poblacion", "Apuao", "Colasi", "Mambungalon", "San Roque"] },
      { name: "Paracale", barangays: ["Poblacion", "Bagumbayan", "Gumaus", "Macolabo", "Palanas"] },
      { name: "San Lorenzo Ruiz", barangays: ["Poblacion", "Dalnac", "Lanot", "Mampurog", "Matacong"] },
      { name: "San Vicente", barangays: ["Poblacion", "Asdum", "Calabagas", "Mangcawayan", "Sinuknipan"] },
      { name: "Santa Elena", barangays: ["Poblacion", "Bulala", "Don Tomas", "Pulong Guitguit", "Rizal"] },
      { name: "Talisay", barangays: ["Poblacion", "Binanuaan", "Caawigan", "Cahabaan", "Sta. Elena"] },
      { name: "Vinzons", barangays: ["Poblacion", "Aguit-it", "Banocboc", "Mangcawayan", "Sabang"] }
    ]
  },
  {
    name: "Camarines Sur",
    municipalities: [
      { name: "Naga City", barangays: ["Centro", "Concepcion Pequeña", "Dinaga", "San Francisco", "Triangulo"] },
      { name: "Iriga City", barangays: ["San Francisco", "San Nicolas", "Santiago", "Santo Domingo", "Poblacion"] },
      { name: "Baao", barangays: ["Poblacion", "Bagumbayan", "Iraya", "Paloyon", "San Isidro"] },
      { name: "Balatan", barangays: ["Poblacion", "Cabanbanan", "Cayogcog", "Lupi", "Siramag"] },
      { name: "Bato", barangays: ["Poblacion", "Cagraray", "Divina Pastora", "Payak", "San Isidro"] },
      { name: "Bombon", barangays: ["Poblacion", "Payak", "San Isidro", "Salvacion", "La Purisima"] },
      { name: "Buhi", barangays: ["Poblacion", "Ibayugan", "Iraya", "Salvacion", "Tambo"] },
      { name: "Bula", barangays: ["Poblacion", "Calagbangan", "Fabrica", "Sagrada", "San Roque"] },
      { name: "Cabusao", barangays: ["Poblacion", "Barcelonita", "Pandan", "Salvacion", "Santa Cruz"] },
      { name: "Calabanga", barangays: ["Poblacion", "Balongay", "Paolbo", "Salvacion", "San Bernardino"] },
      { name: "Camaligan", barangays: ["Poblacion", "Marupit", "Sua", "Dugcal", "San Juan"] },
      { name: "Canaman", barangays: ["Poblacion", "Baras", "Haring", "Mangayawan", "San Juan"] },
      { name: "Caramoan", barangays: ["Poblacion", "Gata", "Paniman", "Tabgon", "Tinago"] },
      { name: "Del Gallego", barangays: ["Poblacion", "Bagong Silang", "Burabod", "Pinagdapian", "Sinuknipan"] },
      { name: "Gainza", barangays: ["Poblacion", "Dahican", "Namuat", "Sampaloc", "Cagbunga"] },
      { name: "Garchitorena", barangays: ["Poblacion", "Aniog", "Cagmaslog", "Salvacion", "Tinalmud"] },
      { name: "Goa", barangays: ["Poblacion", "Bagumbayan", "Cagbunga", "San Jose", "Taban"] },
      { name: "Lagonoy", barangays: ["Poblacion", "Gabi", "Loho", "Panicuan", "San Isidro"] },
      { name: "Libmanan", barangays: ["Poblacion", "Bagacay", "Bahao", "Malbogon", "Pag-asa"] },
      { name: "Lupi", barangays: ["Poblacion", "Bagangan", "Bangon", "Hicming", "Santa Cruz"] },
      { name: "Magarao", barangays: ["Poblacion", "Abo", "San Juan", "Carangcang", "Sta. Lucia"] },
      { name: "Milaor", barangays: ["Poblacion", "Alimbuyog", "Balagbag", "Dalipay", "San Roque"] },
      { name: "Nabua", barangays: ["Poblacion", "Duran", "La Opinion", "San Isidro", "San Roque"] },
      { name: "Ocampo", barangays: ["Poblacion", "Del Rosario", "San Francisco", "San Roque", "Santa Cruz"] },
      { name: "Pamplona", barangays: ["Poblacion", "Balaogan", "Camagong", "Del Carmen", "San Jose"] },
      { name: "Pasacao", barangays: ["Poblacion", "Caranan", "Dalupaon", "Salvacion", "San Antonio"] },
      { name: "Pili", barangays: ["Poblacion", "Cadlan", "Pawili", "San Jose", "Tinangis"] },
      { name: "Presentacion", barangays: ["Poblacion", "Ayugao", "Bagong Silang", "Mabca", "Sta. Cruz"] },
      { name: "Ragay", barangays: ["Poblacion", "Cabadisan", "Godofredo Reyes Sr.", "Lagonoy", "Panaytayan"] },
      { name: "Sagnay", barangays: ["Poblacion", "Nato", "Busak", "Palanog", "Taligarap"] },
      { name: "San Fernando", barangays: ["Poblacion", "Bangbang", "Binalay", "San Juan", "Santa Cruz"] },
      { name: "San Jose", barangays: ["Poblacion", "Adiangao", "Bahay", "Pandan", "Tinalmud"] },
      { name: "Sangay", barangays: ["Poblacion", "Alayao", "Ponglon", "Turague", "Mabini"] },
      { name: "Sipocot", barangays: ["Poblacion", "Aldezar", "Cabuyao", "Impig", "Malaguico"] },
      { name: "Tigaon", barangays: ["Poblacion", "Consocep", "Huyonhuyon", "San Rafael", "Vinagre"] },
      { name: "Tinambac", barangays: ["Poblacion", "Bahi", "Cagbulacao", "Salvacion", "Tamban"] }
    ]
  },
  {
    name: "Camiguin",
    municipalities: [
      { name: "Mambajao", barangays: ["Poblacion", "Agoho", "Balbagon", "Bug-ong", "Kuguita"] },
      { name: "Catarman", barangays: ["Poblacion", "Bonbon", "Hulongdiot", "Mainit", "Tangaro"] },
      { name: "Guinsiliban", barangays: ["Poblacion", "Butay", "Cantaan", "Liong", "Maac"] },
      { name: "Mahinog", barangays: ["Poblacion", "Benoni", "Hubangon", "San Isidro", "Tupsan"] },
      { name: "Sagay", barangays: ["Poblacion", "Alangilan", "Bonbon", "Cagayan", "Mahinog"] }
    ]
  },
  {
    name: "Capiz",
    municipalities: [
      { name: "Roxas City", barangays: ["Poblacion I", "Baybay", "Cagay", "Lawaan", "Milibili"] },
      { name: "Cuartero", barangays: ["Poblacion", "Agcawilan", "Balighot", "Maninang", "Sinabsaban"] },
      { name: "Dao", barangays: ["Poblacion", "Agtambi", "Balucuan", "Manhoy", "Nasunogan"] },
      { name: "Dumalag", barangays: ["Poblacion", "Codingle", "Ermita", "Jagnaya", "Talon"] },
      { name: "Dumarao", barangays: ["Poblacion", "Codingle", "Mianay", "Taslan", "Timagac"] },
      { name: "Ivisan", barangays: ["Poblacion", "Agmalobo", "Basiao", "Matnog", "Santa Cruz"] },
      { name: "Jamindan", barangays: ["Poblacion", "Agbatuan", "Garangan", "Lapaz", "Lucero"] },
      { name: "Ma-ayon", barangays: ["Poblacion", "Aglimocon", "Cabungahan", "Malapaya", "Tugas"] },
      { name: "Mambusao", barangays: ["Poblacion", "Caidquid", "Guibuangan", "Manibad", "Tabuc Norte"] },
      { name: "Panay", barangays: ["Poblacion", "Amaga", "Binuluangan", "Cogon", "Tawog"] },
      { name: "Panitan", barangays: ["Poblacion", "Agbalo", "Cabungahan", "Manibad", "Tacas"] },
      { name: "Pilar", barangays: ["Poblacion", "Binaobawan", "Casanayan", "Dulangan", "Natividad"] },
      { name: "Pontevedra", barangays: ["Poblacion", "Bailan", "Hipona", "Intampilan", "Rizal"] },
      { name: "President Roxas", barangays: ["Poblacion", "Aranguel", "Caidquid", "Manoling", "Quiaman"] },
      { name: "Sapian", barangays: ["Poblacion", "Agbabadiang", "Bilao", "Lonoy", "Mancruz"] },
      { name: "Sigma", barangays: ["Poblacion", "Acbo", "Amontay", "Capilijan", "Mianay"] },
      { name: "Tapaz", barangays: ["Poblacion", "Acutungan", "Aglinab", "Katipunan", "Tacayan"] }
    ]
  },
  {
    name: "Catanduanes",
    municipalities: [
      { name: "Virac", barangays: ["Poblacion", "Constantino", "San Isidro", "San Juan", "Rawis"] },
      { name: "Bagamanoc", barangays: ["Poblacion", "Bacak", "Hinipaan", "Kinuartel", "Pandan"] },
      { name: "Baras", barangays: ["Poblacion", "Buyo", "Ilawod", "Mabatobato", "Puraran"] },
      { name: "Bato", barangays: ["Poblacion", "Bagumbayan", "Ilawod", "San Pedro", "Sombrero"] },
      { name: "Caramoran", barangays: ["Poblacion", "Bato", "Guinsaanan", "Pandan", "Supang"] },
      { name: "Gigmoto", barangays: ["Poblacion", "Biong", "Dororian", "San Pedro", "Sioron"] },
      { name: "Pandan", barangays: ["Poblacion", "Bagong Bayan", "Camangahan", "Cobo", "Tarusan"] },
      { name: "Panganiban", barangays: ["Poblacion", "Alnay", "Cabcab", "Mabini", "Salvacion"] },
      { name: "San Andres", barangays: ["Poblacion", "Agtangcol", "Barihay", "Casinagan", "Timbaan"] },
      { name: "San Miguel", barangays: ["Poblacion", "Buyo", "Sogod", "Tabugon", "Tamburan"] },
      { name: "Viga", barangays: ["Poblacion", "Bogña", "Cabugao", "Lupi", "Sto. Domingo"] }
    ]
  },
  {
    name: "Cavite",
    municipalities: [
      { name: "Bacoor", barangays: ["Poblacion", "Molino", "Talaba", "Zapote", "Habay"] },
      { name: "Imus", barangays: ["Poblacion", "Anabu", "Malagasang", "Medicion", "Tanzang Luma"] },
      { name: "Dasmariñas", barangays: ["Poblacion", "Burol", "Paliparan", "Sabang", "Salawag"] },
      { name: "General Trias", barangays: ["Poblacion", "Arnaldo", "Buenavista", "Manggahan", "Santiago"] },
      { name: "Cavite City", barangays: ["Dalahican", "San Antonio", "Caridad", "Santa Cruz", "Sangley"] },
      { name: "Tagaytay", barangays: ["Kaybagal South", "Maharlika East", "Sungay South", "Tolentino East", "Francisco"] },
      { name: "Trece Martires", barangays: ["Poblacion", "Cabezas", "Osorio", "Luciano", "De Ocampo"] },
      { name: "Carmona", barangays: ["Poblacion", "Cabilang Baybay", "Maduya", "Milagrosa", "Lantic"] },
      { name: "Gen. Mariano Alvarez", barangays: ["Poblacion", "Aldiano Olaes", "Carmona Crossing", "Inocencio", "Tanzang Luma"] },
      { name: "Rosario", barangays: ["Poblacion", "Bagbag", "Kanluran", "Silangan", "Tejeros Convention"] },
      { name: "Silang", barangays: ["Poblacion", "Biga", "Magallanes", "Puting Kahoy", "Tartaria"] },
      { name: "Tanza", barangays: ["Poblacion", "Amaya", "Bagtas", "Mulawin", "Sahud Ulan"] },
      { name: "Naic", barangays: ["Poblacion", "Bagong Kalsada", "Halayhay", "Mabolo", "Sabang"] },
      { name: "Maragondon", barangays: ["Poblacion", "Bucal", "Pinagsanhan", "Raysunan", "Talipusngo"] },
      { name: "Ternate", barangays: ["Poblacion", "Bucana", "San Jose", "San Juan", "Sapang"] },
      { name: "Magallanes", barangays: ["Poblacion", "Baliwag", "Coralat", "Pacheco", "Ramirez"] },
      { name: "Alfonso", barangays: ["Poblacion", "Buck Estate", "Kaysuyo", "Luksuhin", "Upli"] },
      { name: "Amadeo", barangays: ["Poblacion", "Banaybanay", "Buho", "Dagatan", "Maymangga"] },
      { name: "Indang", barangays: ["Poblacion", "Bancod", "Calumpang", "Kayquit", "Tambo"] },
      { name: "Mendez", barangays: ["Poblacion", "Anuling", "Galicia", "Palocpoc", "Panungyan"] },
      { name: "Kawit", barangays: ["Poblacion", "Binakayan", "Marulas", "Kaingen", "Wakas"] },
      { name: "Noveleta", barangays: ["Poblacion", "Magdiwang", "Salcedo", "San Antonio", "San Rafael"] }
    ]
  },
  {
    name: "Cebu",
    municipalities: [
      { name: "Cebu City", barangays: ["Lahug", "Capitol Site", "Mabolo", "Guadalupe", "Banilad"] },
      { name: "Mandaue", barangays: ["Centro", "Banilad", "Jagobiao", "Maguikay", "Tipolo"] },
      { name: "Lapu-Lapu City", barangays: ["Poblacion", "Gun-ob", "Mactan", "Pajo", "Pusok"] },
      { name: "Talisay", barangays: ["Poblacion", "Bulacao", "Lawaan", "Linao", "Tabunok"] },
      { name: "Toledo", barangays: ["Poblacion", "Bato", "Daanlungsod", "Luray", "Sangi"] },
      { name: "Naga", barangays: ["Poblacion", "Alpaco", "Inoburan", "Lanas", "Tinaan"] },
      { name: "Carcar", barangays: ["Poblacion", "Can-asujan", "Guadalupe", "Perrelos", "Valladolid"] },
      { name: "Danao", barangays: ["Poblacion", "Dunggoan", "Guinsay", "Suba", "Taytay"] },
      { name: "Bogo", barangays: ["Poblacion", "Cogon", "Don Pedro", "Marangog", "Nailon"] },
      { name: "Minglanilla", barangays: ["Poblacion", "Lipata", "Pakigne", "Tunghaan", "Vito"] },
      { name: "Consolacion", barangays: ["Poblacion", "Cansaga", "Jugan", "Pitogo", "Tayud"] },
      { name: "Liloan", barangays: ["Poblacion", "Catarman", "Cotcot", "Jubay", "Yati"] },
      { name: "Compostela", barangays: ["Poblacion", "Bagalnga", "Buluang", "Cabadiangan", "Tamiao"] },
      { name: "Cordova", barangays: ["Poblacion", "Alegria", "Bangbang", "Buagsong", "Gabi"] },
      { name: "San Fernando", barangays: ["Poblacion", "Balud", "Magsico", "Panadtaran", "Tabionan"] },
      { name: "Argao", barangays: ["Poblacion", "Bogo", "Bulasa", "Colawin", "Lamacan"] },
      { name: "Dalaguete", barangays: ["Poblacion", "Balud", "Casay", "Mantalongon", "Obo"] },
      { name: "Alcoy", barangays: ["Poblacion", "Atabay", "Daan Lungsod", "Guiwang", "Nug-as"] },
      { name: "Alegria", barangays: ["Poblacion", "Compostela", "Guadalupe", "Legaspi", "Montpeller"] },
      { name: "Aloguinsan", barangays: ["Poblacion", "Bojo", "Bonbon", "Kantabogon", "Pungtod"] },
      { name: "Asturias", barangays: ["Poblacion", "Bago", "Langub", "Manguiao", "Tubigagmanok"] },
      { name: "Badian", barangays: ["Poblacion", "Basak", "Bato", "Lambug", "Zaragosa"] },
      { name: "Balamban", barangays: ["Poblacion", "Buanoy", "Cansomoroy", "Gaas", "Prenza"] },
      { name: "Bantayan", barangays: ["Poblacion", "Atop-atop", "Doong", "Kabangbang", "Sulangan"] },
      { name: "Barili", barangays: ["Poblacion", "Azucena", "Bolocboloc", "Mantayupan", "Sayaw"] },
      { name: "Borbon", barangays: ["Poblacion", "Bagacay", "Don Celestino", "Lugo", "Ogbay"] },
      { name: "Carmen", barangays: ["Poblacion", "Baring", "Corte", "Dawis Norte", "Liburon"] },
      { name: "Catmon", barangays: ["Poblacion", "Agsuwao", "Binongkalan", "Duyan", "Macaas"] },
      { name: "Daanbantayan", barangays: ["Poblacion", "Agujo", "Calape", "Malapascua", "Tominjao"] },
      { name: "Dumanjug", barangays: ["Poblacion", "Balaygtiki", "Bitoon", "Kanangkaan", "Tapon"] },
      { name: "Ginatilan", barangays: ["Poblacion", "Cansiklag", "Guibuangan", "Malatbo", "Naga"] },
      { name: "Malabuyoc", barangays: ["Poblacion", "Armeña", "Cerdeña", "Looc", "Sabang"] },
      { name: "Medellin", barangays: ["Poblacion", "Antipolo", "Curva", "Kawit", "Tindog"] },
      { name: "Moalboal", barangays: ["Poblacion", "Basdiot", "Bala", "Saavedra", "Tuble"] },
      { name: "Oslob", barangays: ["Poblacion", "Alo", "Bangcogon", "Daanlungsod", "Tan-awan"] },
      { name: "Pilar", barangays: ["Poblacion", "Biasong", "Cawit", "Moabog", "Upper Poblacion"] },
      { name: "Pinamungahan", barangays: ["Poblacion", "Anislag", "Busay", "Lamac", "Tajao"] },
      { name: "Poro", barangays: ["Poblacion", "Adela", "Cagcagan", "Daan Paz", "Teguis"] },
      { name: "Ronda", barangays: ["Poblacion", "Can-abuhon", "Cansalonoy", "Liboo", "Tupas"] },
      { name: "Samboan", barangays: ["Poblacion", "Bonbon", "Dalahikan", "Suba", "Tangbo"] },
      { name: "San Remigio", barangays: ["Poblacion", "Anapog", "Bojo", "Lambusan", "Tambongon"] },
      { name: "Santa Fe", barangays: ["Poblacion", "Hagdan", "Hilantagaan", "Langub", "Okoy"] },
      { name: "Santander", barangays: ["Poblacion", "Bunlan", "Candamiang", "Liloan", "Talisay"] },
      { name: "Sevilla", barangays: ["Poblacion", "Balungag", "Cabañas", "Linao", "Tubod"] },
      { name: "Sibonga", barangays: ["Poblacion", "Bae", "Bahay", "Lamacan", "Simala"] },
      { name: "Sogod", barangays: ["Poblacion", "Ampongol", "Bagatayam", "Damolog", "Tabunok"] },
      { name: "Tabogon", barangays: ["Poblacion", "Alambijud", "Mabuli", "Salog", "Tapun"] },
      { name: "Tabuelan", barangays: ["Poblacion", "Bongon", "Dalid", "Kantubaon", "Mabunao"] },
      { name: "Tuburan", barangays: ["Poblacion", "Alegria", "Calatrava", "Kanangkaan", "Putat"] },
      { name: "Tudela", barangays: ["Poblacion", "Buenavista", "Calmante", "General", "Santander"] }
    ]
  },
  {
    name: "Cotabato (North Cotabato)",
    municipalities: [
      { name: "Kidapawan City", barangays: ["Poblacion", "Balindog", "Ilomavis", "Lanao", "Perez"] },
      { name: "Alamada", barangays: ["Poblacion", "Bao", "Kitacubong", "Macabasa", "Ramaon"] },
      { name: "Aleosan", barangays: ["Poblacion", "Dunguan", "Lower Mingading", "New Leon", "San Mateo"] },
      { name: "Antipas", barangays: ["Poblacion", "Camutan", "Magsaysay", "New Cebu", "Sabi"] },
      { name: "Arakan", barangays: ["Poblacion", "Aliamasin", "Datal Tampal", "Ganatan", "Katipunan"] },
      { name: "Banisilan", barangays: ["Poblacion", "Busaon", "Capayuran", "Kidama", "Pantar"] },
      { name: "Carmen", barangays: ["Poblacion", "Aroman", "General Luna", "Mabuhay", "Tonganon"] },
      { name: "Kabacan", barangays: ["Poblacion", "Bangilan", "Kayaga", "Nangaan", "Sanggadong"] },
      { name: "Libungan", barangays: ["Poblacion", "Abaga", "Banayal", "Cabudian", "Sinawingan"] },
      { name: "Magpet", barangays: ["Poblacion", "Amabel", "Bagontapay", "Imas", "Kalaisan"] },
      { name: "Makilala", barangays: ["Poblacion", "Batasan", "Bato", "Cabilao", "Malasila"] },
      { name: "Matalam", barangays: ["Poblacion", "Arakan", "Kilada", "Marbel", "Tumbras"] },
      { name: "M'lang", barangays: ["Poblacion", "Bialong", "Dalipe", "New Cebu", "Sangat"] },
      { name: "Pigcawayan", barangays: ["Poblacion", "Balacayon", "Buliok", "Kadingilan", "Sinawingan"] },
      { name: "Pikit", barangays: ["Poblacion", "Balabak", "Buliok", "Kakar", "Paidu Pulangi"] },
      { name: "President Roxas", barangays: ["Poblacion", "Datu Indang", "Kabalukan", "Mabuhay", "Tagum"] },
      { name: "Tulunan", barangays: ["Poblacion", "Bacong", "Bialong", "La Esperanza", "New Caridad"] }
    ]
  },
  {
    name: "Davao de Oro",
    municipalities: [
      { name: "Nabunturan", barangays: ["Poblacion", "Anislagan", "Basak", "Magsaysay", "San Isidro"] },
      { name: "Compostela", barangays: ["Poblacion", "Bagongon", "Mangayon", "Ngan", "Tamia"] },
      { name: "Laak", barangays: ["Poblacion", "Banbanon", "Kapatagan", "San Vicente", "Tungagon"] },
      { name: "Mabini", barangays: ["Poblacion", "Cadunan", "Golden Valley", "Pindasan", "Tagnanan"] },
      { name: "Maco", barangays: ["Poblacion", "Binuangan", "Elizalde", "Limbo", "Teresa"] },
      { name: "Maragusan", barangays: ["Poblacion", "Bagong Silang", "Mapawa", "New Albay", "Tandik"] },
      { name: "Mawab", barangays: ["Poblacion", "Andili", "Bansalan", "Nueva Visayas", "Sawata"] },
      { name: "Monkayo", barangays: ["Poblacion", "Babag", "Baylo", "Haguimitan", "Salvacion"] },
      { name: "Montevista", barangays: ["Poblacion", "Banagbanag", "Canaan", "Linoan", "New Visayas"] },
      { name: "New Bataan", barangays: ["Poblacion", "Andap", "Cabinuangan", "Maparat", "Panag"] },
      { name: "Pantukan", barangays: ["Poblacion", "Bongabong", "Kingking", "Napnapan", "Tagmamarkay"] }
    ]
  },
  {
    name: "Davao del Norte",
    municipalities: [
      { name: "Tagum", barangays: ["Poblacion", "Apokon", "Canocotan", "Magugpo", "Visayan Village"] },
      { name: "Panabo", barangays: ["Poblacion", "Buenavista", "Gredu", "Nanyo", "San Francisco"] },
      { name: "Island Garden City of Samal", barangays: ["Peñaplata", "Babak", "Caliclic", "Kaputian", "San Isidro"] },
      { name: "Asuncion", barangays: ["Poblacion", "Cambanogoy", "New Santiago", "San Vicente", "Sagayen"] },
      { name: "Braulio E. Dujali", barangays: ["Poblacion", "Cabayangan", "Dujali", "Magupising", "New Casay"] },
      { name: "Carmen", barangays: ["Poblacion", "Alejal", "Ising", "Mabaus", "Tuganay"] },
      { name: "Kapalong", barangays: ["Poblacion", "Florida", "Gabuyan", "Maniki", "Sua-on"] },
      { name: "New Corella", barangays: ["Poblacion", "Del Monte", "Luna", "Mesaoy", "San Roque"] },
      { name: "San Isidro", barangays: ["Poblacion", "Dacudao", "Kipalili", "Libuganon", "Monte Dujali"] },
      { name: "Santo Tomas", barangays: ["Poblacion", "Balagunan", "Casig-ang", "Kimamon", "Tibal-og"] },
      { name: "Talaingod", barangays: ["Poblacion", "Dagohoy", "Palma Gil", "Santo Niño", "Sto. Niño"] }
    ]
  },
  {
    name: "Davao del Sur",
    municipalities: [
      { name: "Digos City", barangays: ["Poblacion", "Aplaya", "Kapatagan", "San Agustin", "Zone 3"] },
      { name: "Bansalan", barangays: ["Poblacion", "Bitaug", "Managa", "Rizal", "Tambak"] },
      { name: "Hagonoy", barangays: ["Poblacion", "Balutakay", "Guihing", "Malabang", "Sacub"] },
      { name: "Kiblawan", barangays: ["Poblacion", "Bagumbayan", "Kibongkog", "Tacub", "Dulos"] },
      { name: "Magsaysay", barangays: ["Poblacion", "Bacungan", "Dalawinon", "Malawanit", "Upper Bala"] },
      { name: "Malalag", barangays: ["Poblacion", "Bolton", "Bulacan", "Ibo", "Tagansule"] },
      { name: "Matanao", barangays: ["Poblacion", "Asbang", "Buas", "Sinaragan", "Towak"] },
      { name: "Padada", barangays: ["Poblacion", "Harada Butai", "Lower Limonzo", "Palili", "Upper Magsaysay"] },
      { name: "Santa Cruz", barangays: ["Poblacion", "Astorga", "Coronon", "Darong", "Zone I"] },
      { name: "Sulop", barangays: ["Poblacion", "Balasinon", "Lapla", "Solongvale", "Waterfall"] }
    ]
  },
  {
    name: "Davao Occidental",
    municipalities: [
      { name: "Malita", barangays: ["Poblacion", "Bito", "Bolila", "Demoloc", "Talita"] },
      { name: "Don Marcelino", barangays: ["Poblacion", "Baluntaya", "Calian", "Kiblat", "Talagutong"] },
      { name: "Jose Abad Santos", barangays: ["Poblacion", "Caburan", "Mangile", "Molmol", "Trinidad"] },
      { name: "Santa Maria", barangays: ["Poblacion", "Basiawan", "Cadaatan", "Kidadan", "Tanlad"] },
      { name: "Sarangani", barangays: ["Poblacion", "Batuganding", "Laker", "Mabila", "Tagen"] }
    ]
  },
  {
    name: "Davao Oriental",
    municipalities: [
      { name: "Mati", barangays: ["Poblacion", "Buso", "Dahican", "Dawan", "Sainz"] },
      { name: "Baganga", barangays: ["Poblacion", "Banhawan", "Bobonao", "Kinablangan", "Salingcomot"] },
      { name: "Banaybanay", barangays: ["Poblacion", "Cabangcalan", "Caganganan", "Mahayag", "Piso"] },
      { name: "Boston", barangays: ["Poblacion", "Caatijan", "Carmen", "San Jose", "Sibajay"] },
      { name: "Caraga", barangays: ["Poblacion", "Lamiawan", "Manorigao", "Pichon", "Sobrecarey"] },
      { name: "Cateel", barangays: ["Poblacion", "Abijod", "Alegria", "Mainit", "San Alfonso"] },
      { name: "Governor Generoso", barangays: ["Poblacion", "Anitap", "Lavigan", "Sigaboy", "Tibanban"] },
      { name: "Lupon", barangays: ["Poblacion", "Bagumbayan", "Corporacion", "Ilangay", "Tagboa"] },
      { name: "Manay", barangays: ["Poblacion", "Cagbaoto", "Central Visayas", "Guza", "Old Macopa"] },
      { name: "San Isidro", barangays: ["Poblacion", "Baon", "Cambaleon", "Maputi", "Santo Rosario"] },
      { name: "Tarragona", barangays: ["Poblacion", "Central", "Limao", "Tomoagang", "Tumalite"] }
    ]
  },
  {
    name: "Dinagat Islands",
    municipalities: [
      { name: "San Jose", barangays: ["Poblacion", "Aurelio", "Cuarinta", "Jacquez", "Wilson"] },
      { name: "Basilisa", barangays: ["Poblacion", "Benglen", "Columbus", "Ferdinandville", "Rizal"] },
      { name: "Cagdianao", barangays: ["Poblacion", "Boa", "Carmen", "Legaspi", "Valencia"] },
      { name: "Dinagat", barangays: ["Poblacion", "Cab-ilan", "Gomez", "Justiniana Edera", "Magsaysay"] },
      { name: "Libjo", barangays: ["Poblacion", "Albor", "Arellano", "Kanihaan", "San Jose"] },
      { name: "Loreto", barangays: ["Poblacion", "Carmen", "Ferdinand", "Magsaysay", "San Juan"] },
      { name: "Tubajon", barangays: ["Poblacion", "Imelda", "Mabini", "Navarro", "San Roque"] }
    ]
  },
  {
    name: "Eastern Samar",
    municipalities: [
      { name: "Borongan", barangays: ["Poblacion", "Cabong", "Lalawigan", "Maypangdan", "Songco"] },
      { name: "Arteche", barangays: ["Poblacion", "Bigo", "Canjaway", "Jicontol", "Rawis"] },
      { name: "Balangiga", barangays: ["Poblacion", "Bacjao", "Canjaway", "Guinmaayohan", "San Miguel"] },
      { name: "Balangkayan", barangays: ["Poblacion", "Cabay", "Cagpile", "Guinob-an", "Magsaysay"] },
      { name: "Can-avid", barangays: ["Poblacion", "Balud", "Cagda-o", "Magsaysay", "Rawis"] },
      { name: "Dolores", barangays: ["Poblacion", "Aroganga", "Buenavista", "Osmeña", "San Agustin"] },
      { name: "General MacArthur", barangays: ["Poblacion", "Calutcot", "Lavezares", "San Isidro", "Tandang Sora"] },
      { name: "Giporlos", barangays: ["Poblacion", "Barangay 1", "Cagaut", "Hino-otogan", "San Jose"] },
      { name: "Guiuan", barangays: ["Poblacion", "Bagua", "Calicoan", "Salug", "Sulangan"] },
      { name: "Hernani", barangays: ["Poblacion", "Cahagnaan", "Canciledes", "Magsaysay", "Padang"] },
      { name: "Jipapad", barangays: ["Poblacion", "Anahawan", "Buenavista", "Cagmanaba", "San Roque"] },
      { name: "Lawaan", barangays: ["Poblacion", "Betaog", "Bolusao", "Guinob-an", "Taguite"] },
      { name: "Llorente", barangays: ["Poblacion", "Antipolo", "Bagyagan", "Cagboboto", "Rizal"] },
      { name: "Maslog", barangays: ["Poblacion", "Barangay 1", "Carapdapan", "Mabuhay", "San Isidro"] },
      { name: "Maydolong", barangays: ["Poblacion", "Burak", "Camada", "Malobago", "Tiguib"] },
      { name: "Mercedes", barangays: ["Poblacion", "Busay", "Canlao", "Iyao", "San Jose"] },
      { name: "Oras", barangays: ["Poblacion", "Agsam", "Batang", "Cababtoan", "Tawagan"] },
      { name: "Quinapondan", barangays: ["Poblacion", "Alang-alang", "Caculangan", "Guibuangan", "Rizal"] },
      { name: "Salcedo", barangays: ["Poblacion", "Burak", "Cagaut", "Mercado", "San Roque"] },
      { name: "San Julian", barangays: ["Poblacion", "Burak", "Campidhan", "Ngolos", "San Jose"] },
      { name: "San Policarpo", barangays: ["Poblacion", "Alugan", "Boco", "Camantang", "Santa Cruz"] },
      { name: "Sulat", barangays: ["Poblacion", "Abas", "Burak", "Malobago", "San Roque"] },
      { name: "Taft", barangays: ["Poblacion", "Buenavista", "Magsaysay", "San Jose", "San Pablo"] }
    ]
  },
  {
    name: "Guimaras",
    municipalities: [
      { name: "Jordan", barangays: ["Poblacion", "Buluangan", "Espinosa", "Hoskyn", "San Miguel"] },
      { name: "Buenavista", barangays: ["Poblacion", "Agtambo", "Mclain", "Montfort", "Salvacion"] },
      { name: "Nueva Valencia", barangays: ["Poblacion", "Cabalagnan", "Igang", "Lucmayan", "Sulangan"] },
      { name: "San Lorenzo", barangays: ["Poblacion", "Aguilar", "Cabano", "Sapal", "Tamborong"] },
      { name: "Sibunag", barangays: ["Poblacion", "Concordia", "Dasal", "Inampologan", "San Isidro"] }
    ]
  },
  {
    name: "Ifugao",
    municipalities: [
      { name: "Lagawe", barangays: ["Poblacion", "Boliwong", "Burnay", "Olilicon", "Tungngod"] },
      { name: "Aguinaldo", barangays: ["Poblacion", "Banaue", "Chalalo", "Damag", "Tulludan"] },
      { name: "Alfonso Lista", barangays: ["Poblacion", "Bangar", "Liwon", "Namulditan", "San Juan"] },
      { name: "Asipulo", barangays: ["Poblacion", "Amduntog", "Camandag", "Namal", "Pula"] },
      { name: "Banaue", barangays: ["Poblacion", "Batad", "Bangaan", "Tam-an", "Viewpoint"] },
      { name: "Hingyon", barangays: ["Poblacion", "Anao", "Cababuyan", "Mompolia", "Umalbong"] },
      { name: "Hungduan", barangays: ["Poblacion", "Abatan", "Bangbang", "Hapao", "Nungulunan"] },
      { name: "Kiangan", barangays: ["Poblacion", "Ambabag", "Baguinge", "Dalligan", "Nagacadan"] },
      { name: "Lamut", barangays: ["Poblacion", "Bimpal", "Hapid", "Magulon", "Panopdopan"] },
      { name: "Mayoyao", barangays: ["Poblacion", "Balangbang", "Chaya", "Mongol", "Palaad"] },
      { name: "Tinoc", barangays: ["Poblacion", "Ahin", "Binablayan", "Dangla", "Tukucan"] }
    ]
  }
];

module.exports = data;
