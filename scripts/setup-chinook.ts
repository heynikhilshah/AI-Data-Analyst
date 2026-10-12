import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const dbPath = path.resolve(process.cwd(), "chinook.db");

console.log("Setting up Chinook database at:", dbPath);

// Delete existing chinook.db if any
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

// 1. Create Schema
db.exec(`
CREATE TABLE IF NOT EXISTS Artist (
    ArtistId INTEGER PRIMARY KEY AUTOINCREMENT,
    Name NVARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS Album (
    AlbumId INTEGER PRIMARY KEY AUTOINCREMENT,
    Title NVARCHAR(160) NOT NULL,
    ArtistId INTEGER NOT NULL,
    FOREIGN KEY (ArtistId) REFERENCES Artist (ArtistId)
);

CREATE TABLE IF NOT EXISTS Genre (
    GenreId INTEGER PRIMARY KEY AUTOINCREMENT,
    Name NVARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS MediaType (
    MediaTypeId INTEGER PRIMARY KEY AUTOINCREMENT,
    Name NVARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS Track (
    TrackId INTEGER PRIMARY KEY AUTOINCREMENT,
    Name NVARCHAR(200) NOT NULL,
    AlbumId INTEGER,
    MediaTypeId INTEGER NOT NULL,
    GenreId INTEGER,
    Composer NVARCHAR(220),
    Milliseconds INTEGER NOT NULL,
    Bytes INTEGER,
    UnitPrice NUMERIC(10,2) NOT NULL,
    FOREIGN KEY (AlbumId) REFERENCES Album (AlbumId),
    FOREIGN KEY (GenreId) REFERENCES Genre (GenreId),
    FOREIGN KEY (MediaTypeId) REFERENCES MediaType (MediaTypeId)
);

CREATE TABLE IF NOT EXISTS Employee (
    EmployeeId INTEGER PRIMARY KEY AUTOINCREMENT,
    LastName NVARCHAR(20) NOT NULL,
    FirstName NVARCHAR(20) NOT NULL,
    Title NVARCHAR(30),
    ReportsTo INTEGER,
    BirthDate DATETIME,
    HireDate DATETIME,
    Address NVARCHAR(70),
    City NVARCHAR(40),
    State NVARCHAR(40),
    Country NVARCHAR(40),
    PostalCode NVARCHAR(10),
    Phone NVARCHAR(24),
    Fax NVARCHAR(24),
    Email NVARCHAR(60),
    FOREIGN KEY (ReportsTo) REFERENCES Employee (EmployeeId)
);

CREATE TABLE IF NOT EXISTS Customer (
    CustomerId INTEGER PRIMARY KEY AUTOINCREMENT,
    FirstName NVARCHAR(40) NOT NULL,
    LastName NVARCHAR(20) NOT NULL,
    Company NVARCHAR(80),
    Address NVARCHAR(70),
    City NVARCHAR(40),
    State NVARCHAR(40),
    Country NVARCHAR(40),
    PostalCode NVARCHAR(10),
    Phone NVARCHAR(24),
    Fax NVARCHAR(24),
    Email NVARCHAR(60) NOT NULL,
    SupportRepId INTEGER,
    FOREIGN KEY (SupportRepId) REFERENCES Employee (EmployeeId)
);

CREATE TABLE IF NOT EXISTS Invoice (
    InvoiceId INTEGER PRIMARY KEY AUTOINCREMENT,
    CustomerId INTEGER NOT NULL,
    InvoiceDate DATETIME NOT NULL,
    BillingAddress NVARCHAR(70),
    BillingCity NVARCHAR(40),
    BillingState NVARCHAR(40),
    BillingCountry NVARCHAR(40),
    BillingPostalCode NVARCHAR(10),
    Total NUMERIC(10,2) NOT NULL,
    FOREIGN KEY (CustomerId) REFERENCES Customer (CustomerId)
);

CREATE TABLE IF NOT EXISTS InvoiceLine (
    InvoiceLineId INTEGER PRIMARY KEY AUTOINCREMENT,
    InvoiceId INTEGER NOT NULL,
    TrackId INTEGER NOT NULL,
    UnitPrice NUMERIC(10,2) NOT NULL,
    Quantity INTEGER NOT NULL,
    FOREIGN KEY (InvoiceId) REFERENCES Invoice (InvoiceId),
    FOREIGN KEY (TrackId) REFERENCES Track (TrackId)
);

CREATE TABLE IF NOT EXISTS Playlist (
    PlaylistId INTEGER PRIMARY KEY AUTOINCREMENT,
    Name NVARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS PlaylistTrack (
    PlaylistId INTEGER NOT NULL,
    TrackId INTEGER NOT NULL,
    PRIMARY KEY (PlaylistId, TrackId),
    FOREIGN KEY (PlaylistId) REFERENCES Playlist (PlaylistId),
    FOREIGN KEY (TrackId) REFERENCES Track (TrackId)
);
`);

console.log("Tables created successfully. Seeding data...");

// 2. Seed Data
const insertGenre = db.prepare("INSERT INTO Genre (Name) VALUES (?)");
const genres = [
  "Rock", "Jazz", "Metal", "Alternative & Punk", "Rock And Roll",
  "Blues", "Latin", "Reggae", "Pop", "Soundtrack", "Bossa Nova",
  "Easy Listening", "Heavy Metal", "R&B/Soul", "Electronic", "Classical"
];
genres.forEach(g => insertGenre.run(g));

const insertMediaType = db.prepare("INSERT INTO MediaType (Name) VALUES (?)");
const mediaTypes = [
  "MPEG audio file", "Protected AAC audio file", "Protected MPEG-4 video file",
  "Purchased AAC audio file", "AAC audio file"
];
mediaTypes.forEach(m => insertMediaType.run(m));

const insertArtist = db.prepare("INSERT INTO Artist (Name) VALUES (?)");
const artists = [
  "AC/DC", "Accept", "Aerosmith", "Alanis Morissette", "Alice In Chains",
  "Antônio Carlos Jobim", "Apocalyptica", "Audioslave", "BackBeat", "Billy Cobham",
  "Black Label Society", "Black Sabbath", "Body Count", "Bruce Dickinson", "Buddy Guy",
  "Caetano Veloso", "Chico Buarque", "Chico Science & Nação Zumbi", "Cidade Negra", "Cláudio Zoli",
  "Various Artists", "Led Zeppelin", "Frank Sinatra", "Gene Krupa", "Godsmack",
  "Guns N' Roses", "Incubus", "Iron Maiden", "James Brown", "Jamiroquai",
  "Jimi Hendrix", "Joe Satriani", "Jota Quest", "Judas Priest", "Legião Urbana",
  "Lenny Kravitz", "Lulu Santos", "Marillion", "Marisa Monte", "Marvin Gaye",
  "Men At Work", "Metallica", "Miles Davis", "Milton Nascimento", "Mötley Crüe",
  "Nirvana", "O Terço", "Olodum", "Os Paralamas Do Sucesso", "Ozzy Osbourne",
  "Page & Plant", "Paul D'Ianno", "Pearl Jam", "Pink Floyd", "Queen",
  "R.E.M.", "Raul Seixas", "Red Hot Chili Peppers", "Santana", "Scorpions",
  "Spyro Gyra", "Stevie Ray Vaughan & Double Trouble", "The Beatles", "The Clash", "The Cult",
  "The Doors", "The Police", "The Rolling Stones", "The Who", "Tim Maia",
  "Titãs", "Battlestar Galactica", "Heroes", "Lost", "U2", "Deep Purple"
];
artists.forEach(a => insertArtist.run(a));

const insertAlbum = db.prepare("INSERT INTO Album (Title, ArtistId) VALUES (?, ?)");
const albumsData = [
  ["For Those About To Rock We Salute You", 1],
  ["Let There Be Rock", 1],
  ["Balls to the Wall", 2],
  ["Restless and Wild", 2],
  ["Big Ones", 3],
  ["Jagged Little Pill", 4],
  ["Facelift", 5],
  ["Warner 25 Anos", 6],
  ["Plays Metallica By Four Cellos", 7],
  ["Audioslave", 8],
  ["Out of Exile", 8],
  ["BackBeat Soundtrack", 9],
  ["The Best Of Billy Cobham", 10],
  ["Alcohol Fueled Brewtality Live!", 11],
  ["Black Sabbath", 12],
  ["Black Sabbath Vol4 (Remaster)", 12],
  ["Body Count", 13],
  ["Chemical Wedding", 14],
  ["The Best Of Buddy Guy - The Millenium Collection", 15],
  ["Prenda Minha", 16],
  ["Sozinho Ao Vivo", 16],
  ["Minha Historia", 17],
  ["Afrociberdelia", 18],
  ["Da Lama Ao Caos", 18],
  ["Acústico MTV", 19],
  ["Cidade Negra - Hits", 19],
  ["Na Pista", 20],
  ["Axé Bahia 2001", 21],
  ["BBC Sessions [Disc 1] [Live]", 22],
  ["Physical Graffiti [Disc 1]", 22],
  ["BBC Sessions [Disc 2] [Live]", 22],
  ["Led Zeppelin I", 22],
  ["Led Zeppelin II", 22],
  ["Led Zeppelin III", 22],
  ["Led Zeppelin IV", 22],
  ["My Way: The Best Of Frank Sinatra", 23],
  ["Up An' Atom", 24],
  ["Faceless", 25],
  ["Appetite for Destruction", 26],
  ["Use Your Illusion I", 26],
  ["Use Your Illusion II", 26],
  ["Make Yourself", 27],
  ["A Matter of Life and Death", 28],
  ["Brave New World", 28],
  ["Dance Of Death", 28],
  ["Fear Of The Dark", 28],
  ["Iron Maiden", 28],
  ["Killers", 28],
  ["A Night at the Opera", 55],
  ["News of the World", 55],
  ["The Game", 55],
  ["Master of Puppets", 42],
  ["Ride the Lightning", 42],
  ["Metallica (The Black Album)", 42],
  ["Kind of Blue", 43],
  ["Nevermind", 46],
  ["In Utero", 46],
  ["The Dark Side of the Moon", 54],
  ["The Wall", 54],
  ["Wish You Were Here", 54],
  ["Abbey Road", 63],
  ["Sgt. Pepper's Lonely Hearts Club Band", 63],
  ["Joshua Tree", 75],
  ["Achtung Baby", 75],
  ["Machine Head", 76]
];
albumsData.forEach(([title, artistId]) => insertAlbum.run(title, artistId));

// Tracks
const insertTrack = db.prepare(`
  INSERT INTO Track (Name, AlbumId, MediaTypeId, GenreId, Composer, Milliseconds, Bytes, UnitPrice)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const sampleTracks = [
  // AC/DC
  ["For Those About To Rock (We Salute You)", 1, 1, 1, "Angus Young, Malcolm Young, Brian Johnson", 343719, 11170334, 0.99],
  ["Put The Finger On You", 1, 1, 1, "Angus Young, Malcolm Young, Brian Johnson", 205662, 6713451, 0.99],
  ["Let's Get It Up", 1, 1, 1, "Angus Young, Malcolm Young, Brian Johnson", 233926, 7636944, 0.99],
  ["Inject The Venom", 1, 1, 1, "Angus Young, Malcolm Young, Brian Johnson", 210834, 6852860, 0.99],
  ["Snowballed", 1, 1, 1, "Angus Young, Malcolm Young, Brian Johnson", 203102, 6599724, 0.99],
  ["Evil Walks", 1, 1, 1, "Angus Young, Malcolm Young, Brian Johnson", 263497, 8611245, 0.99],
  ["C.O.D.", 1, 1, 1, "Angus Young, Malcolm Young, Brian Johnson", 199836, 6566314, 0.99],
  ["Breaking The Rules", 1, 1, 1, "Angus Young, Malcolm Young, Brian Johnson", 263288, 8596840, 0.99],
  ["Night Of The Long Knives", 1, 1, 1, "Angus Young, Malcolm Young, Brian Johnson", 205688, 6709433, 0.99],
  ["Spellbound", 1, 1, 1, "Angus Young, Malcolm Young, Brian Johnson", 270863, 8817038, 0.99],
  // Queen
  ["Bohemian Rhapsody", 49, 1, 1, "Freddie Mercury", 354320, 11520120, 1.29],
  ["Love of My Life", 49, 1, 1, "Freddie Mercury", 218000, 7120000, 0.99],
  ["You're My Best Friend", 49, 1, 1, "John Deacon", 172000, 5600000, 0.99],
  ["We Will Rock You", 50, 1, 1, "Brian May", 121000, 3950000, 1.29],
  ["We Are the Champions", 50, 1, 1, "Freddie Mercury", 179000, 5820000, 1.29],
  ["Another One Bites the Dust", 51, 1, 1, "John Deacon", 215000, 6980000, 1.29],
  ["Under Pressure", 51, 1, 1, "Queen & David Bowie", 244000, 7920000, 1.29],
  // Metallica
  ["Battery", 52, 1, 3, "James Hetfield, Lars Ulrich", 312000, 10100000, 0.99],
  ["Master of Puppets", 52, 1, 3, "Hetfield, Ulrich, Burton, Hammett", 515000, 16800000, 1.29],
  ["Enter Sandman", 54, 1, 3, "Hetfield, Ulrich, Hammett", 331000, 10800000, 1.29],
  ["Nothing Else Matters", 54, 1, 3, "Hetfield, Ulrich", 388000, 12600000, 1.29],
  ["The Unforgiven", 54, 1, 3, "Hetfield, Ulrich, Hammett", 387000, 12500000, 1.29],
  // Miles Davis
  ["So What", 55, 1, 2, "Miles Davis", 562000, 18200000, 1.29],
  ["Freddie Freeloader", 55, 1, 2, "Miles Davis", 589000, 19100000, 0.99],
  ["Blue in Green", 55, 1, 2, "Miles Davis, Bill Evans", 337000, 10900000, 0.99],
  ["All Blues", 55, 1, 2, "Miles Davis", 693000, 22500000, 1.29],
  // Nirvana
  ["Smells Like Teen Spirit", 56, 1, 4, "Kurt Cobain", 301000, 9800000, 1.29],
  ["Come As You Are", 56, 1, 4, "Kurt Cobain", 219000, 7100000, 1.29],
  ["Lithium", 56, 1, 4, "Kurt Cobain", 257000, 8300000, 0.99],
  ["Heart-Shaped Box", 57, 1, 4, "Kurt Cobain", 281000, 9100000, 1.29],
  // Pink Floyd
  ["Time", 58, 1, 1, "Waters, Gilmour, Wright, Mason", 413000, 13400000, 1.29],
  ["Money", 58, 1, 1, "Roger Waters", 382000, 12400000, 1.29],
  ["Comfortably Numb", 59, 1, 1, "David Gilmour, Roger Waters", 382000, 12400000, 1.29],
  ["Wish You Were Here", 60, 1, 1, "David Gilmour, Roger Waters", 334000, 10800000, 1.29],
  // Beatles
  ["Come Together", 61, 1, 1, "Lennon-McCartney", 259000, 8400000, 1.29],
  ["Something", 61, 1, 1, "George Harrison", 182000, 5900000, 1.29],
  ["Here Comes the Sun", 61, 1, 1, "George Harrison", 185000, 6000000, 1.29],
  ["Lucy in the Sky with Diamonds", 62, 1, 1, "Lennon-McCartney", 208000, 6700000, 0.99],
  // Led Zeppelin
  ["Stairway to Heaven", 35, 1, 1, "Jimmy Page, Robert Plant", 482000, 15600000, 1.29],
  ["Black Dog", 35, 1, 1, "Page, Plant, Jones", 296000, 9600000, 0.99],
  ["Kashmir", 30, 1, 1, "Jimmy Page, Robert Plant, John Bonham", 517000, 16800000, 1.29],
  ["Whole Lotta Love", 33, 1, 1, "Jimmy Page, Robert Plant, John Paul Jones", 333000, 10800000, 1.29],
  // U2
  ["With or Without You", 63, 1, 1, "U2", 296000, 9600000, 1.29],
  ["Where the Streets Have No Name", 63, 1, 1, "U2", 337000, 10900000, 1.29],
  ["One", 64, 1, 1, "U2", 276000, 8900000, 1.29],
  // Deep Purple
  ["Smoke on the Water", 65, 1, 1, "Blackmore, Gillan, Glover, Lord, Paice", 340000, 11000000, 1.29],
  ["Highway Star", 65, 1, 1, "Blackmore, Gillan, Glover, Lord, Paice", 365000, 11800000, 0.99]
];

// Let's generate additional tracks for each album to reach ~250 tracks
for (let albumId = 1; albumId <= 65; albumId++) {
  const genreId = ((albumId % 16) + 1);
  for (let trackNum = 1; trackNum <= 3; trackNum++) {
    sampleTracks.push([
      `Track ${trackNum} (Album ${albumId})`,
      albumId,
      1,
      genreId,
      "Various Composers",
      180000 + (trackNum * 45000),
      6000000 + (trackNum * 1200000),
      0.99
    ]);
  }
}

sampleTracks.forEach(t => insertTrack.run(...t));

// Employees
const insertEmployee = db.prepare(`
  INSERT INTO Employee (LastName, FirstName, Title, ReportsTo, BirthDate, HireDate, Address, City, State, Country, PostalCode, Phone, Fax, Email)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertEmployee.run("Adams", "Andrew", "General Manager", null, "1962-02-18", "2016-08-14", "11120 Jasper Ave NW", "Edmonton", "AB", "Canada", "T5K 2N1", "+1 (780) 428-9482", "+1 (780) 428-3457", "andrew@chinookcorp.com");
insertEmployee.run("Edwards", "Nancy", "Sales Manager", 1, "1958-12-08", "2016-05-01", "825 8 Ave SW", "Calgary", "AB", "Canada", "T2P 2T9", "+1 (403) 262-3443", "+1 (403) 262-3322", "nancy@chinookcorp.com");
insertEmployee.run("Peacock", "Jane", "Sales Support Agent", 2, "1973-08-29", "2017-04-01", "1111 6 Ave SW", "Calgary", "AB", "Canada", "T2P 5M5", "+1 (403) 262-3443", "+1 (403) 262-6712", "jane@chinookcorp.com");
insertEmployee.run("Park", "Margaret", "Sales Support Agent", 2, "1947-09-19", "2017-05-03", "683 10 Street SW", "Calgary", "AB", "Canada", "T2P 5G3", "+1 (403) 263-4423", "+1 (403) 263-4289", "margaret@chinookcorp.com");
insertEmployee.run("Johnson", "Steve", "Sales Support Agent", 2, "1965-03-03", "2017-10-17", "7727B 41 Ave", "Calgary", "AB", "Canada", "T3B 1Y7", "+1 (403) 246-9887", "+1 (403) 246-9899", "steve@chinookcorp.com");
insertEmployee.run("Mitchell", "Michael", "IT Manager", 1, "1973-07-01", "2016-10-17", "5827 Bowness Road NW", "Calgary", "AB", "Canada", "T3B 0C5", "+1 (403) 246-9887", "+1 (403) 246-9899", "michael@chinookcorp.com");

// Customers
const insertCustomer = db.prepare(`
  INSERT INTO Customer (FirstName, LastName, Company, Address, City, State, Country, PostalCode, Phone, Email, SupportRepId)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const customers = [
  ["Luís", "Gonçalves", "Embraer - Empresa Brasileira de Aeronáutica S.A.", "Av. Brigadeiro Faria Lima, 2170", "São José dos Campos", "SP", "Brazil", "12227-000", "+55 (12) 3923-5555", "luisg@embraer.com.br", 3],
  ["Leonie", "Köhler", null, "Theodor-Heuss-Straße 34", "Stuttgart", null, "Germany", "70174", "+49 0711 2842222", "leonekohler@surfeu.de", 5],
  ["François", "Tremblay", null, "1498 rue Bélanger", "Montréal", "QC", "Canada", "H2G 1A7", "+1 (514) 721-4711", "ftremblay@gmail.com", 3],
  ["Bjørn", "Hansen", null, "Ullevålsveien 14", "Oslo", null, "Norway", "0171", "+47 22 44 22 22", "bjorn.hansen@yahoo.no", 4],
  ["František", "Wichterlová", null, "Klanova 9/506", "Prague", null, "Czech Republic", "14700", "+420 2 4172 5555", "frantisekw@kolumbus.cz", 4],
  ["Helena", "Holý", null, "Rilská 3174/6", "Prague", null, "Czech Republic", "14300", "+420 2 4177 0449", "hholy@gmail.com", 5],
  ["Astrid", "Gruber", null, "Rotenturmstraße 4, 1010 Innere Stadt", "Vienne", null, "Austria", "1010", "+43 01 6334555", "astrid.gruber@apple.at", 5],
  ["Daan", "Peeters", null, "Rue Joseph-Bens 54", "Brussels", null, "Belgium", "B-1180", "+32 02 347 07 72", "daan_peeters@apple.be", 4],
  ["Kara", "Nielsen", null, "Sønder Boulevard 51", "Copenhagen", null, "Denmark", "1720", "+45 33 25 38 79", "kara.nielsen@jubii.dk", 4],
  ["Eduardo", "Martins", "Woodstock Discos", "Rua Dr. Falcão Filho, 155", "São Paulo", "SP", "Brazil", "01007-010", "+55 (11) 3033-5446", "eduardo@woodstock.com.br", 4],
  ["Alexandre", "Rocha", "Banco do Brasil S.A.", "Av. Paulista, 2022", "São Paulo", "SP", "Brazil", "01310-200", "+55 (11) 3055-3278", "alero@uol.com.br", 5],
  ["Roberto", "Almeida", "Riotur", "Praça Pio X, 119", "Rio de Janeiro", "RJ", "Brazil", "20040-020", "+55 (21) 2271-7000", "roberto.almeida@riotur.gov.br", 3],
  ["Fernanda", "Ramos", null, "QNM 01 Conjunto D, Lote 16", "Brasília", "DF", "Brazil", "72210-044", "+55 (61) 3356-9882", "ferramoseux@uol.com.br", 4],
  ["Mark", "Philips", "Telus", "8210 111 ST NW", "Edmonton", "AB", "Canada", "T6G 2C7", "+1 (780) 434-4554", "mphilips12@shaw.ca", 5],
  ["Jennifer", "Peterson", "Rogers Canada", "700 W Pender Street", "Vancouver", "BC", "Canada", "V6C 1G8", "+1 (604) 688-2255", "jenniferp@rogers.ca", 3],
  ["Frank", "Harris", "Google Inc.", "1600 Amphitheatre Parkway", "Mountain View", "CA", "USA", "94043-1351", "+1 (650) 253-0000", "fharris@google.com", 3],
  ["Jack", "Smith", "Microsoft Corporation", "1 Microsoft Way", "Redmond", "WA", "USA", "98052-8300", "+1 (425) 882-8080", "jacksmith@microsoft.com", 5],
  ["Michelle", "Brooks", null, "627 Broadway", "New York", "NY", "USA", "10012-2612", "+1 (212) 221-3546", "michelleb@aol.com", 3],
  ["Tim", "Goyer", "Apple Inc.", "1 Infinite Loop", "Cupertino", "CA", "USA", "95014", "+1 (408) 996-1010", "tgoyer@apple.com", 3],
  ["Dan", "Miller", null, "541 Del Medio Ave.", "Mountain View", "CA", "USA", "94040-111", "+1 (650) 644-3358", "dmiller@comcast.net", 4],
  ["Kathy", "Chase", null, "801 W 4th Street", "Reno", "NV", "USA", "89503", "+1 (775) 223-7665", "kachase@hotmail.com", 5],
  ["Heather", "Leacock", null, "120 S Orange Ave", "Orlando", "FL", "USA", "32801", "+1 (407) 999-7788", "hleacock@gmail.com", 4],
  ["John", "Gordon", null, "6920 Green Boulevard", "Boston", "MA", "USA", "02138", "+1 (617) 522-1333", "johngordon22@yahoo.com", 3],
  ["Richard", "Cunningham", null, "221 1/2 N Orange Grove Blvd", "Pasadena", "CA", "USA", "91103", "+1 (626) 797-4489", "ricunningham@hotmail.com", 4],
  ["Patrick", "Gray", null, "1033 N Park Ave", "Tucson", "AZ", "USA", "85719", "+1 (520) 622-4200", "patrick.gray@aol.com", 4],
  ["Julia", "Barnett", null, "302 S 700 E", "Salt Lake City", "UT", "USA", "84102", "+1 (801) 531-7272", "jubarnett@gmail.com", 5],
  ["Robert", "Brown", null, "162 E Superior St", "Chicago", "IL", "USA", "60611", "+1 (312) 332-3232", "robbrown@shaw.ca", 3],
  ["Edward", "Francis", null, "230 Elgin Street", "Ottawa", "ON", "Canada", "K2P 1L7", "+1 (613) 234-3322", "edfrancis@yaho.ca", 3],
  ["Martha", "Silk", null, "194A Chain Lake Drive", "Halifax", "NS", "Canada", "B3S 1C5", "+1 (902) 450-0450", "marthast@rogers.ca", 5],
  ["Hannah", "Schneider", null, "Tauentzienstraße 8", "Berlin", null, "Germany", "10789", "+49 030 26550280", "hannah.schneider@yahoo.de", 5],
  ["Fynn", "Zimmermann", null, "Mindener Weg 39", "Frankfurt", null, "Germany", "60322", "+49 069 40598889", "fynn.zimmermann@yehey.com", 3],
  ["Niklas", "Schröder", null, "Barbarossastraße 19", "Berlin", null, "Germany", "10779", "+49 030 2141444", "nschroder@surfeu.de", 3],
  ["Camille", "Bernard", null, "Boulevard de Tirvaux 29", "Paris", null, "France", "75020", "+33 01 49 70 65 65", "camille.bernard@yahoo.fr", 4],
  ["Dominique", "Lefebvre", null, "25, Boulevard René Levasseur", "Paris", null, "France", "72000", "+33 01 35 48 38 86", "dominiquelefebvre@sol.fr", 5],
  ["Marc", "Dubois", null, "11, Rue de la Paix", "Lyon", null, "France", "69002", "+33 04 78 30 30 30", "marc.dubois@hotmail.com", 5],
  ["Wyatt", "Girard", null, "9, Chaussée de Wavre", "Bordeaux", null, "France", "33000", "+33 05 56 96 96 96", "wyatt.girard@yahoo.fr", 3],
  ["Isabelle", "Mercier", null, "68, Rue Jouvence", "Dijon", null, "France", "21000", "+33 03 80 73 66 99", "isabelle.mercier@gmail.com", 2],
  ["Terhi", "Hämäläinen", null, "Porthaninkatu 9", "Helsinki", null, "Finland", "00530", "+358 09 870 2000", "terhi.hamalainen@apple.fi", 3],
  ["Ladislav", "Kovács", null, "Erzsébet krt. 58.", "Budapest", null, "Hungary", "H-1073", "+36 1 413 6000", "ladislav_kovacs@apple.hu", 3],
  ["Hugh", "O'Reilly", null, "110 Raheny Road", "Dublin", "Dublin", "Ireland", null, "+353 01 6792424", "hughoreilly@apple.ie", 3],
  ["Lucas", "Mancini", null, "Via Degli Ombrellari 94", "Rome", "RM", "Italy", "00193", "+39 06 39733434", "lucas.mancini@yahoo.it", 5],
  ["Johannes", "Van der Berg", null, "Keizersgracht 666", "Amsterdam", "Noord-Holland", "Netherlands", "1017 ET", "+31 020 6223130", "johavanderberg@yahoo.nl", 5],
  ["Stanisław", "Wójcik", null, "Marszałkowska 140", "Warsaw", null, "Poland", "00-061", "+48 22 8289 204", "stanisław.wójcik@wp.pl", 4],
  ["Enrique", "Muñoz", null, "C/ San Bernardo 85", "Madrid", null, "Spain", "28015", "+34 914 454 454", "enrique_munoz@yahoo.es", 3],
  ["Joakim", "Johansson", null, "Celsiusgatan 9", "Stockholm", null, "Sweden", "11230", "+46 08-651 88 20", "joakim.johansson@yahoo.se", 5],
  ["Emma", "Jones", null, "190 Gray's Inn Road", "London", null, "United Kingdom", "WC1X 8ED", "+44 020 7837 0000", "emma_jones@hotmail.com", 3],
  ["Phil", "Hughes", null, "113 Lupus St", "London", null, "United Kingdom", "SW1V 3EN", "+44 020 7976 5722", "phil.hughes@gmail.com", 3],
  ["Steve", "Murray", null, "107-111 Charing Cross Rd", "London", null, "United Kingdom", "WC2H 0DT", "+44 020 7434 4000", "steve.murray@yahoo.uk", 5],
  ["Mark", "Taylor", null, "423 Bourk Street", "Melbourne", "VIC", "Australia", "3000", "+61 (03) 9670 1692", "mark.taylor@yahoo.au", 5],
  ["Diego", "Gutiérrez", null, "315 Queensberry St", "North Melbourne", "VIC", "Australia", "3051", "+61 (03) 9326 7720", "diego.gutierrez@yahoo.ar", 4]
];

customers.forEach(c => insertCustomer.run(...c));

// Invoices & InvoiceLines
const insertInvoice = db.prepare(`
  INSERT INTO Invoice (CustomerId, InvoiceDate, BillingAddress, BillingCity, BillingState, BillingCountry, BillingPostalCode, Total)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertInvoiceLine = db.prepare(`
  INSERT INTO InvoiceLine (InvoiceId, TrackId, UnitPrice, Quantity)
  VALUES (?, ?, ?, ?)
`);

// Generate realistic invoices spanning 2022 to 2025 across customers
const totalTracksInDb = sampleTracks.length;
let invoiceCount = 0;
const startYear = 2022;
const endYear = 2025;

const transaction = db.transaction(() => {
  for (let customerId = 1; customerId <= customers.length; customerId++) {
    const cust = customers[customerId - 1];
    const numInvoices = 6 + (customerId % 7); // 6 to 12 invoices per customer

    for (let i = 0; i < numInvoices; i++) {
      const year = startYear + Math.floor(Math.random() * (endYear - startYear + 1));
      const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
      const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
      const date = `${year}-${month}-${day} 00:00:00`;

      const numLines = 2 + Math.floor(Math.random() * 6); // 2 to 7 items per invoice
      let invoiceTotal = 0;
      const lineItems: { trackId: number; price: number; quantity: number }[] = [];

      for (let l = 0; l < numLines; l++) {
        const trackId = Math.floor(Math.random() * totalTracksInDb) + 1;
        const price = Math.random() > 0.3 ? 0.99 : 1.29;
        const quantity = 1;
        invoiceTotal += price * quantity;
        lineItems.push({ trackId, price, quantity });
      }

      const invResult = insertInvoice.run(
        customerId,
        date,
        cust[3] || "123 Main St",
        cust[4] || "City",
        cust[5] || null,
        cust[6] || "USA",
        cust[7] || "12345",
        parseFloat(invoiceTotal.toFixed(2))
      );

      const invoiceId = Number(invResult.lastInsertRowid);
      invoiceCount++;

      for (const item of lineItems) {
        insertInvoiceLine.run(invoiceId, item.trackId, item.price, item.quantity);
      }
    }
  }
});

transaction();

// Playlists
const insertPlaylist = db.prepare("INSERT INTO Playlist (Name) VALUES (?)");
const playlists = ["Music", "Movies", "TV Shows", "Audiobooks", "90's Music", "Audiobooks", "Heavy Metal Classics", "Rock Favorites"];
playlists.forEach(p => insertPlaylist.run(p));

console.log(`Database seeded successfully! Total Invoices generated: ${invoiceCount}`);

// Verify Row Counts
const tables = ["Artist", "Album", "Genre", "MediaType", "Track", "Employee", "Customer", "Invoice", "InvoiceLine", "Playlist"];
for (const t of tables) {
  const count = db.prepare(`SELECT count(*) as c FROM ${t}`).get() as { c: number };
  console.log(`- ${t}: ${count.c} rows`);
}

db.close();
console.log("Chinook DB ready at chinook.db!");
