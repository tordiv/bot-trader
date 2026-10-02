// Curatela fantacalcistica 2026/27 (stime pre-asta, da rifinire con il listone ufficiale).
// tier: forza della squadra (1 = top, 5 = lotta salvezza)
// xi: titolari fissi attesi · bal: ballottaggi · rig: [1°, 2°] rigorista · pun: punizioni · cor: corner
// Quotazioni, FVM e ruoli arrivano dal listone ufficiale (fonti/*.xlsx), non da qui.
export const CURATION = {
  inter: {
    tier: 1,
    xi: ['Josep Martínez', 'Manuel Akanji', 'Alessandro Bastoni', 'John Stones', 'Djed Spence', 'Federico Dimarco', 'Nicolò Barella', 'Hakan Çalhanoğlu', 'Petar Sučić', 'Lautaro Martínez', 'Marcus Thuram'],
    bal: ['Yann Bisseck', 'Luis Henrique', 'Piotr Zieliński', 'Henrikh Mkhitaryan', 'Francesco Pio Esposito', 'Ange-Yoan Bonny', 'Carlos Augusto', 'Benjamin Pavard', 'Curtis Jones', 'Andy Diouf'],
    rig: ['Hakan Çalhanoğlu', 'Lautaro Martínez'], pun: ['Federico Dimarco', 'Hakan Çalhanoğlu'], cor: ['Hakan Çalhanoğlu', 'Federico Dimarco'],
  },
  napoli: {
    tier: 1,
    xi: ['Vanja Milinković-Savić', 'Giovanni Di Lorenzo', 'Amir Rrahmani', 'Alessandro Buongiorno', 'Mathías Olivera', 'Stanislav Lobotka', 'Frank Anguissa', 'Scott McTominay', 'Kevin De Bruyne', 'Matteo Politano', 'Rasmus Højlund'],
    bal: ['Alex Meret', 'Sam Beukema', 'Leonardo Spinazzola', 'David Neres', 'Noa Lang', 'Lorenzo Lucca', 'Billy Gilmour', 'Luca Marianucci', 'Antonio Vergara', 'Alisson Santos'],
    rig: ['Kevin De Bruyne', 'Rasmus Højlund'], pun: ['Kevin De Bruyne', 'Matteo Politano'], cor: ['Kevin De Bruyne', 'Matteo Politano'],
  },
  juventus: {
    tier: 1,
    xi: ['Guglielmo Vicario', 'Pierre Kalulu', 'Bremer', 'Lloyd Kelly', 'Andrea Cambiaso', 'Manuel Locatelli', 'Khéphren Thuram', 'Weston McKennie', 'Francisco Conceição', 'Kenan Yıldız', 'Nick Woltemade'],
    bal: ['Federico Gatti', 'Randal Kolo Muani', 'Edon Zhegrova', 'Teun Koopmeiners', 'Pape Matar Sarr', 'Juan Cabal', 'Zeki Çelik', 'Jérémie Boga', 'Jhon Lucumí', 'Nico González', 'Kerim Alajbegović'],
    rig: ['Kenan Yıldız', 'Manuel Locatelli'], pun: ['Kenan Yıldız', 'Teun Koopmeiners'], cor: ['Teun Koopmeiners', 'Francisco Conceição'],
  },
  milan: {
    tier: 1,
    xi: ['Mike Maignan', 'Fikayo Tomori', 'Matteo Gabbia', 'Strahinja Pavlović', 'Alexis Saelemaekers', 'Pervis Estupiñán', 'Luka Modrić', 'Adrien Rabiot', 'Ardon Jashari', 'Christian Pulisic', 'Gonçalo Ramos'],
    bal: ['Mario Gila', 'Koni De Winter', 'Davide Bartesaghi', 'Ruben Loftus-Cheek', 'Omari Hutchinson', 'Yunus Musah', 'Samuel Chukwueze', 'Francesco Camarda', 'Diego Moreira'],
    rig: ['Christian Pulisic', 'Gonçalo Ramos'], pun: ['Christian Pulisic', 'Luka Modrić'], cor: ['Luka Modrić', 'Christian Pulisic'],
  },
  como: {
    tier: 2,
    xi: ['Robert Sánchez', 'Ivan Smolčić', 'Trevoh Chalobah', 'Jacobo Ramón', 'Álex Valle', 'Máximo Perrone', 'Samuele Ricci', 'Jesús Rodríguez', 'Nico Paz', 'Assane Diao', 'Moise Kean'],
    bal: ['Jean Butez', 'Marc-Oliver Kempf', 'Yan Couto', 'Maxence Caqueret', 'Martin Baturina', 'Lucas Da Cunha', 'Anastasios Douvikas', 'Jayden Addai', 'Kaiki Bruno'],
    rig: ['Nico Paz', 'Moise Kean'], pun: ['Nico Paz', 'Martin Baturina'], cor: ['Nico Paz', 'Álex Valle'],
  },
  roma: {
    tier: 2,
    xi: ['Mile Svilar', 'Gianluca Mancini', 'Evan Ndicka', 'Konstantinos Koulierakis', 'Wesley', 'Nahuel Molina', 'Manu Koné', 'Marten de Roon', 'Matías Soulé', 'Paulo Dybala', 'Donyell Malen'],
    bal: ['Mario Hermoso', 'Daniele Ghilardi', 'Devyne Rensch', 'Bryan Cristante', 'Lorenzo Pellegrini', 'Santiago Castro', 'Niccolò Pisilli', 'Leonardo Balerdi', 'Rodrigo Mora'],
    rig: ['Paulo Dybala', 'Lorenzo Pellegrini'], pun: ['Paulo Dybala', 'Matías Soulé'], cor: ['Matías Soulé', 'Lorenzo Pellegrini'],
  },
  atalanta: {
    tier: 2,
    xi: ['Marco Carnesecchi', 'Odilon Kossounou', 'Isak Hien', 'Giorgio Scalvini', 'Raoul Bellanova', 'Davide Zappacosta', 'Éderson', 'Franck Kessié', 'Charles De Ketelaere', 'Giacomo Raspadori', 'Gianluca Scamacca'],
    bal: ['Sead Kolašinac', 'Lorenzo Bernasconi', 'Mario Pašalić', 'Lazar Samardžić', 'Kamaldeen Sulemana', 'Nikola Krstović', 'Nicola Zalewski', 'Eljif Elmas', 'Jonathan Rowe'],
    rig: ['Giacomo Raspadori', 'Charles De Ketelaere'], pun: ['Lazar Samardžić', 'Giacomo Raspadori'], cor: ['Charles De Ketelaere', 'Nicola Zalewski'],
  },
  bologna: {
    tier: 3,
    xi: ['Łukasz Skorupski', 'Emil Holm', 'Torbjørn Heggem', 'Martin Vitík', 'Juan Miranda', 'Lewis Ferguson', 'Nikola Moro', 'Riccardo Orsolini', 'Jens Odgaard', 'Nicolò Cambiaghi', 'Artem Dovbyk'],
    bal: ['Nicolò Casale', 'Nadir Zortea', 'Arthur Theate', 'Tommaso Pobega', 'Federico Bernardeschi', 'Roberto Piccoli', 'Oussama El Azzouzi', 'Samuel Mbangula'],
    rig: ['Riccardo Orsolini', 'Artem Dovbyk'], pun: ['Riccardo Orsolini', 'Federico Bernardeschi'], cor: ['Riccardo Orsolini', 'Juan Miranda'],
  },
  lazio: {
    tier: 3,
    xi: ['Christos Mandas', 'Adam Marušić', 'Josip Šutalo', 'Danilho Doekhi', 'Nuno Tavares', 'Kenneth Taylor', 'Nicolò Rovella', 'Davide Frattesi', 'Gustav Isaksen', 'Andrea Pinamonti', 'Mattia Zaccagni'],
    bal: ['Oliver Provstgaard', 'Diogo Leite', 'Luca Pellegrini', 'Manuel Lazzari', 'Fisayo Dele-Bashiru', 'Danilo Cataldi', 'Tijjani Noslin', 'Albert Guðmundsson', 'Matteo Cancellieri'],
    rig: ['Mattia Zaccagni', 'Andrea Pinamonti'], pun: ['Albert Guðmundsson', 'Mattia Zaccagni'], cor: ['Mattia Zaccagni', 'Albert Guðmundsson'],
  },
  fiorentina: {
    tier: 3,
    xi: ['David de Gea', 'Dodô', 'Marin Pongračić', 'Radu Drăgușin', 'Fabiano Parisi', 'Nicolò Fagioli', 'Arthur Atta', 'Marco Brescianini', 'Franco Mastantuono', 'Beto', 'Pedro Gonçalves'],
    bal: ['Luca Ranieri', 'Wilfried Gnonto', 'Cher Ndour', 'Álex Jiménez', 'Mateo Pellegrino', 'Alieu Njie'],
    rig: ['Pedro Gonçalves', 'Beto'], pun: ['Nicolò Fagioli', 'Franco Mastantuono'], cor: ['Pedro Gonçalves', 'Nicolò Fagioli'],
  },
  torino: {
    tier: 4,
    xi: ['Lucas Perri', 'Nathan Patterson', 'Saúl Coco', 'Ardian Ismajli', 'Cristiano Biraghi', 'Cesare Casadei', 'Emirhan İlkhan', 'Nikola Vlašić', 'Zakaria Aboukhlal', 'Giovanni Simeone', 'Duván Zapata'],
    bal: ['Pietro Comuzzo', 'Ricardo Rodriguez', 'Rafik Belghali', 'Rolando Mandragora', 'Gvidas Gineitis', 'Ché Adams', 'Sandro Kulenović', 'Alessio Cacciamani'],
    rig: ['Nikola Vlašić', 'Giovanni Simeone'], pun: ['Nikola Vlašić', 'Cristiano Biraghi'], cor: ['Cristiano Biraghi', 'Nikola Vlašić'],
  },
  udinese: {
    tier: 4,
    xi: ['Maduka Okoye', 'Oumar Solet', 'Christian Kabasele', 'Nicolò Bertola', 'Alessandro Zanoli', 'Hassane Kamara', 'Jesper Karlström', 'Sandi Lovrić', 'Jurgen Ekkelenkamp', 'Nicolò Zaniolo', 'Keinan Davis'],
    bal: ['David Alaba', 'Matteo Palma', 'Lennon Miller', 'Oier Zarraga', 'Vakoun Bayo', 'Idrissa Gueye', 'Jakub Piotrowski', 'Enzo Ebosse', 'Mërgim Vojvoda'],
    rig: ['Keinan Davis', 'Nicolò Zaniolo'], pun: ['Sandi Lovrić', 'Nicolò Zaniolo'], cor: ['Sandi Lovrić', 'Oier Zarraga'],
  },
  genoa: {
    tier: 4,
    xi: ['Justin Bijlow', 'Alessandro Marcandalli', 'Leo Østigård', 'Johan Vásquez', 'Stefano Sabelli', 'Morten Frendrup', 'Djibril Sow', 'Mikael Egill Ellertsson', 'Tommaso Baldanzi', 'Vitinha', 'Lorenzo Colombo'],
    bal: ['Sebastian Otoa', 'Kingsley Ehizibue', 'Mario Mitaj', 'Júnior Messias', 'Lorenzo Venturino', 'Stephan El Shaarawy', 'Hamed Traorè', 'Milutin Osmajić'],
    rig: ['Lorenzo Colombo', 'Júnior Messias'], pun: ['Tommaso Baldanzi', 'Júnior Messias'], cor: ['Tommaso Baldanzi', 'Stefano Sabelli'],
  },
  sassuolo: {
    tier: 4,
    xi: ['Arijanet Muric', 'Sebastian Walukiewicz', 'Jay Idzes', 'Fedde Leysen', 'Josh Doig', 'Kristian Thorstvedt', 'Nemanja Matić', 'Ismaël Koné', 'Domenico Berardi', 'Armand Laurienté', 'Sebastiano Esposito'],
    bal: ['Fali Candé', 'Duje Ćaleta-Car', 'Cas Odenthal', 'Luca Lipani', 'Cristian Volpato', 'Kieron Bowie', 'Daniel Boloca', 'Vasilije Adžić', 'Darryl Bakola'],
    rig: ['Domenico Berardi', 'Armand Laurienté'], pun: ['Domenico Berardi', 'Armand Laurienté'], cor: ['Domenico Berardi', 'Armand Laurienté'],
  },
  parma: {
    tier: 4,
    xi: ['Edoardo Corvi', 'Enrico Delprato', 'Mariano Troilo', 'Abdoulaye Ndiaye', 'Sascha Britschgi', 'Emanuele Valeri', 'Mandela Keita', 'Adrián Bernabé', 'Vincent Sierro', 'Pontus Almqvist', 'El Bilal Touré'],
    bal: ['Lautaro Valenti', 'Franco Carboni', 'Christian Ordóñez', 'Benjamin Cremaschi', 'Hans Nicolussi Caviglia', 'Matija Frigan', 'Ousmane Diallo', 'Giovanni Fabbian', 'Diego Carlos', 'David Romero'],
    rig: ['Adrián Bernabé', 'El Bilal Touré'], pun: ['Adrián Bernabé', 'Emanuele Valeri'], cor: ['Adrián Bernabé', 'Emanuele Valeri'],
  },
  cagliari: {
    tier: 5,
    xi: ['Elia Caprile', 'Yukinari Sugawara', 'Yerry Mina', 'Juan Rodríguez', 'Riyad Idrissi', 'Michel Adopo', 'Harry Winks', 'Alessandro Deiola', 'Jacopo Fazzini', 'Daniel Maldini', 'Kevin Carlos'],
    bal: ['Zé Pedro', 'Adam Obert', 'Roberto Gagliardini', 'Mattia Felici', "M'Bala Nzola", 'Yael Trepy', 'Alessandro Romano', 'Paul Mendy'],
    rig: ['Jacopo Fazzini', 'Kevin Carlos'], pun: ['Jacopo Fazzini', 'Daniel Maldini'], cor: ['Jacopo Fazzini', 'Riyad Idrissi'],
  },
  lecce: {
    tier: 5,
    xi: ['Wladimiro Falcone', 'Danilo Veiga', 'Kialonda Gaspar', 'Tiago Gabriel', 'Antonino Gallo', 'Lassana Coulibaly', 'Mohamed Kaba', 'Medon Berisha', 'Santiago Pierotti', 'Nikola Štulić', "Konan N'Dri"],
    bal: ['Jamil Siebert', 'Corrie Ndaba', 'Youssef Maleh', 'Ivan Ilić', 'Omri Gandelman', 'Sadik Fofana', 'Joël Monteiro', 'Willem Geubbels'],
    rig: ['Nikola Štulić', 'Medon Berisha'], pun: ['Medon Berisha', 'Antonino Gallo'], cor: ['Antonino Gallo', 'Medon Berisha'],
  },
  monza: {
    tier: 5,
    xi: ['Noel Törnqvist', 'Lorenzo Lucchesi', 'Jan Ziółkowski', 'Andrea Carboni', 'Samuele Birindelli', 'Ricardo Mangas', 'Matteo Pessina', 'Leonardo Colombo', 'Andrea Colpani', 'Cyril Ngonge', 'Patrick Cutrone'],
    bal: ['Valentin Antov', 'Saba Goglichidze', 'Ebenezer Akinsanmiro', 'Omari Forson', 'Dany Mota', 'Patrick Ciurria', 'Michael Folorunsho', 'Gustavo Varela', 'Jay Robinson'],
    rig: ['Matteo Pessina', 'Patrick Cutrone'], pun: ['Andrea Colpani', 'Matteo Pessina'], cor: ['Andrea Colpani', 'Patrick Ciurria'],
  },
  frosinone: {
    tier: 5,
    xi: ['Lorenzo Palmisani', 'Anthony Oyono', 'Ilario Monterisi', 'Kevin Akpoguma', 'Gabriele Bracaglia', 'Giacomo Calò', 'Florian Grillitsch', 'Ben Lhassine Kone', 'Farès Ghedjemis', 'Antonio Raimondo', 'Giorgi Kvernadze'],
    bal: ['Gabriele Calvani', 'Giorgio Cittadini', 'Aleksa Terzić', 'Romano Schmid', 'Alessio Zerbin', 'Daniel Bîrligea', 'Francesco Gelli', 'Tomáš Bobček'],
    rig: ['Antonio Raimondo', 'Giacomo Calò'], pun: ['Giacomo Calò', 'Romano Schmid'], cor: ['Giacomo Calò', 'Farès Ghedjemis'],
  },
  venezia: {
    tier: 5,
    xi: ['Filip Stanković', 'Joël Schingtienne', 'Juan Jesus', 'Armel Bella-Kotchap', 'Pasquale Mazzocchi', 'Ridgeciano Haps', 'Gianluca Busio', 'Simon Sohm', 'Alfred Duncan', 'John Yeboah', 'Andrea Adorante'],
    bal: ['Lorenzo Montipò', 'Antoine Hainaut', 'Bartol Franjić', 'Thierry Correia', 'Toma Bašić', 'Kike Pérez', 'Akor Adams', 'Albion Rrahmani'],
    rig: ['Gianluca Busio', 'Andrea Adorante'], pun: ['Gianluca Busio', 'John Yeboah'], cor: ['Gianluca Busio', 'Ridgeciano Haps'],
  },
};

// Nomi del listone non riconducibili automaticamente al nome della rosa (squadra -> listone -> rosa)
export const ALIASES = {
  napoli: { 'Zambo Anguissa': 'Frank Anguissa' },
};
