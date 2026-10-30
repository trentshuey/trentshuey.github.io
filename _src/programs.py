"""Concert program archive, newest first. Add new programs at the top.

Each program:
  id        anchor on programs.html
  date      "YYYY-MM-DD" (or "YYYY-MM" when the day is unknown)
  group     "percussion", "jazz", or "other" (used by the filter buttons)
  ensemble  who performed
  title     concert title (HTML allowed), optional
  venue     optional
  intro     optional sentence (HTML allowed)
  pieces    list of (composer, title, detail) for a single program
  sets      list of (heading, pieces) when the program is split by combo
  personnel optional string
  links     list of (label, href)
"""

def yt(vid):
    return f"https://www.youtube.com/watch?v={vid}"


PROGRAMS = [
    {
        "id": "percussion-ensemble-2026-11-03", "date": "2026-11-03", "group": "percussion",
        "ensemble": "ASU Percussion Ensemble", "title": "<i>In C</i>",
        "venue": "Elta Joyce Murphey Auditorium",
        "pieces": [
            ("Edgard Var&egrave;se", "<i>Ionisation</i>", ""),
            ("Gustav Mahler", "<i>Adagietto</i> from Symphony No. 5", "Arranged by Grubbs"),
            ("Terry Riley", "<i>In C</i>", ""),
        ],
        "links": [("Event details", "events.html#asu-percussion-ensemble-2026-11-03")],
        "image": "poster-asupe-2026-11-03",
    },
    {
        "id": "jazz-combos-2026-10-31", "date": "2026-10-31", "group": "jazz",
        "ensemble": "ASU Jazz Combos", "title": "Halloween Concert and Jam Session",
        "venue": "The House of FiFi DuBois",
        "intro": "Every musician on stage in costume, followed by an open jam session.",
        "sets": [
            ("Combo 1", [("Herbie Hancock", "<i>Watermelon Man</i>", "")]),
            ("Combo 4", [("Mongo Santamar&iacute;a", "<i>Afro Blue</i>", "")]),
            ("Combo 3", [
                ("Dizzy Gillespie, Chano Pozo and Gil Fuller", "<i>Manteca</i>", ""),
                ("Eddie Harris", "<i>Cold Duck Time</i>", ""),
            ]),
            ("Combo 2", [
                ("Miles Davis", "<i>So What</i>", ""),
                ("Erroll Garner", "<i>Misty</i>", ""),
                ("Randy Brecker", "<i>Some Skunk Funk</i>", ""),
            ]),
        ],
        "links": [("Program (PDF)", "assets/docs/programs/2026-10-31-asu-jazz-combos.pdf")],
        "image": "poster-combos-2026-10-31-orange",
    },
    {
        "id": "jazz-ensemble-2026-10-13", "date": "2026-10-13", "group": "jazz",
        "ensemble": "ASU Jazz Ensemble", "title": "<i>A Tribute to Chick Corea</i>",
        "venue": "Brooks &amp; Bates Theatre",
        "links": [("Watch", yt("qt4H3LOLcFc"))],
    },
    {
        "id": "jazz-combos-2026-09-26", "date": "2026-09-26", "group": "jazz",
        "ensemble": "ASU Jazz Combos", "title": "Live at the House of FiFi DuBois",
        "venue": "The House of FiFi DuBois",
        "sets": [
            ("Combo 1", [("Thelonious Monk", "<i>Blue Monk</i>", ""), ("Miles Davis", "<i>Four</i>", "")]),
            ("Combo 3", [("Kenny Dorham", "<i>Blue Bossa</i>", ""), ("Joseph Kosma", "<i>Autumn Leaves</i>", "")]),
            ("Combo 4", [
                ("Ant&ocirc;nio Carlos Jobim", "<i>Agua de Beber</i>", ""),
                ("Marcos and Paulo S&eacute;rgio Valle", "<i>Summer Samba</i>", ""),
            ]),
            ("Combo 2", [("Oliver Nelson", "<i>Stolen Moments</i>", ""), ("Dizzy Gillespie", "<i>A Night in Tunisia</i>", "")]),
        ],
        "links": [
            ("Program (PDF)", "assets/docs/programs/2026-09-26-asu-jazz-combos.pdf"),
            ("Watch the full concert", yt("mDvBY8oI1Dg")),
        ],
    },
    {
        "id": "jazz-combo-2026-04-23", "date": "2026-04-23", "group": "jazz",
        "ensemble": "ASU Jazz Combo", "title": "Shuey and Friends",
        "venue": "Norris-Vincent College of Business",
        "links": [("Watch", yt("Ub_fkD02SMQ"))],
    },
    {
        "id": "percussion-ensemble-2026-04-07", "date": "2026-04-07", "group": "percussion",
        "ensemble": "ASU Percussion Ensemble", "title": "<i>House Music</i>",
        "venue": "Elta Joyce Murphey Auditorium",
        "intro": "Music for found objects, built around John Cage's <i>Living Room Music</i>.",
        "pieces": [
            ("John Cage", "<i>Living Room Music</i>", ""),
            ("Rupert Kettle", "<i>Dining Room Music</i>", ""),
            ("Connor Shafran", "<i>Game of the Century</i>", ""),
            ("Thierry De Mey", "<i>Table Music</i>", ""),
            ("Lansing McLoskey", "<i>B(ee) Movie</i>", ""),
            ("&Eacute;ric Sammut", "<i>Libertango</i>", ""),
        ],
        "links": [("Preview in San Angelo LIVE!", "https://sanangelolive.com/news/san-angelo/2026-04-03/asu-percussion-ensemble-perform-house-music-spring-concert")],
    },
    {
        "id": "jazz-ensemble-2025-12-03", "date": "2025-12-03", "group": "jazz",
        "ensemble": "ASU Jazz Ensemble", "title": "Video Game Music",
        "venue": "Elta Joyce Murphey Auditorium",
        "intro": "The fall 2025 finale: big band charts from the arcade to Undertale.",
        "pieces": [
            ("Don Sebesky", "<i>Captain Arcade&rsquo;s Video Game Parade</i>", ""),
            ("Charlie Rosen", "<i>Five Nights at Freddy&rsquo;s</i>", ""),
            ("Koji Kondo", "<i>Ground Theme</i>", "From <i>Super Mario Bros.</i>"),
            ("Toby Fox", "<i>Megalovania</i>", "From <i>Undertale</i>"),
            ("Hilario Dur&aacute;n", "<i>Paqman</i>", "After <i>Pac-Man</i>"),
            ("Charlie Rosen", "<i>Still Alive</i>", "From <i>Portal</i>"),
            ("Koji Kondo", "<i>Yoshi Star Galaxy Theme</i>", "From <i>Super Mario Galaxy 2</i>"),
            ("Kay Kyser", "<i>Jingle Jangle Jingle</i>", "From <i>Fallout: New Vegas</i>"),
            ("Mahito Yokota", "<i>The Credits Roll</i>", "From <i>Super Mario 3D World</i>"),
        ],
        "links": [("Preview in San Angelo LIVE!", "https://sanangelolive.com/node/104801")],
    },
    {
        "id": "percussion-ensemble-2025-11-11", "date": "2025-11-11", "group": "percussion",
        "ensemble": "ASU Percussion Ensemble", "title": "<i>Glimmer</i>",
        "venue": "Elta Joyce Murphey Auditorium",
        "intro": "The ensemble's first concert in ASU's newly renovated auditorium.",
        "image": "glimmer-ensemble",
        "pieces": [
            ("Tom&aacute;&scaron; Svoboda", "<i>Morning Prayer</i>", ""),
            ("Kirk Gay", "<i>Fear Cage</i>", ""),
            ("Clif Walker", "<i>Disguised</i>", ""),
            ("George Hamilton Green", "<i>Xylophone Rag</i>", ""),
            ("Ivan Trevi&ntilde;o", "<i>Glimmer</i>", ""),
            ("Gene Koshinski", "<i>Dance of the Drums</i>", ""),
        ],
        "links": [("Preview in San Angelo LIVE!", "https://sanangelolive.com/news/san-angelo/2025-11-10/asu-percussion-ensemble-perform-glimmer-concert-newly-renovated-auditorium")],
    },
    {
        "id": "symphony-2025-09-27", "date": "2025-09-27", "group": "other",
        "ensemble": "ASU Symphony Orchestra", "title": "<i>Thunderstruck</i>",
        "pieces": [("Philip Glass", "<i>Concerto Fantasy for Two Timpanists</i>", "Dr. Trent Shuey and Dr. Lisa Rogers, timpani")],
        "links": [("Preview in San Angelo LIVE!", "https://sanangelolive.com/news/san-angelo/2025-09-24/asu-symphony-orchestra-deliver-thunderous-fall-debut-thunderstruck-concert")],
    },
    {
        "id": "jazz-combo-2025-spring", "date": "2025-05-03", "group": "jazz",
        "date_label": "March 29, April 19, and May 3, 2025", "date_short": "Spring 2025",
        "ensemble": "ASU Jazz Combo", "title": "Spring Jam Sessions",
        "venue": "The House of FiFi DuBois",
        "intro": "Three Saturday afternoons downtown. The combo, with Dr. Shuey on vibraphone, played from 4:00 to 5:00, then opened the stage to musicians from the audience.",
        "links": [
            ("March preview", "https://sanangelolive.com/news/entertainment/2025-03-26/house-fifi-dubois-host-jazz-combo-jam-session"),
            ("April preview", "https://sanangelolive.com/news/entertainment/2025-04-17/angelo-state-jazz-musicians-host-downtown-jam-session"),
            ("May preview", "https://sanangelolive.com/news/san-angelo/2025-05-02/angelo-state-host-final-spring-jazz-jam-downtown-san-angelo"),
        ],
    },
    {
        "id": "percussion-ensemble-2025-04-14", "date": "2025-04-14", "group": "percussion",
        "ensemble": "ASU Percussion Ensemble", "title": "Spring Concert",
        "venue": "Eldon Black Recital Hall",
        "pieces": [
            ("John Cage", "<i>Living Room Music</i>", ""),
            ("David Maslanka", "<i>Crown of Thorns</i>", ""),
            ("Andr&eacute; and Jacques Philidor", "<i>March for Two Pairs of Kettledrums</i>", ""),
            ("Emmanuel S&eacute;journ&eacute;", "<i>Losa</i>", ""),
        ],
        "links": [
            ("Watch <i>Losa</i>", yt("3v-zzi0JI8s")),
            ("Preview in San Angelo LIVE!", "https://sanangelolive.com/news/entertainment/2025-04-11/angelo-state-percussion-ensemble-hold-spring-concert"),
        ],
    },
    {
        "id": "big-band-2025-02-21", "date": "2025-02-21", "group": "jazz",
        "ensemble": "ASU Big Band", "title": "<i>A Tribute to Count Basie</i>",
        "venue": "Brooks &amp; Bates Theatre",
        "pieces": [
            ("", "<i>Moten Swing</i>", ""), ("", "<i>Jumpin&rsquo; at the Woodside</i>", ""),
            ("", "<i>Splanky</i>", ""), ("", "<i>All of Me</i>", ""), ("", "<i>Corner Pocket</i>", ""),
            ("", "<i>Li&rsquo;l Darlin&rsquo;</i>", ""), ("", "<i>Cute</i>", ""),
            ("", "<i>April in Paris</i>", ""), ("", "<i>One O&rsquo;Clock Jump</i>", ""),
        ],
        "links": [
            ("FOX West Texas story", yt("q5LhYGG-5ZM")),
            ("Preview in San Angelo LIVE!", "https://sanangelolive.com/news/san-angelo/2025-02-19/angelo-state-big-band-swing-spring-count-basie-tribute-concert"),
        ],
    },
    {
        "id": "big-band-2024-11-15", "date": "2024-11-15", "group": "jazz",
        "ensemble": "ASU Big Band and Jazz Combos", "title": "<i>Jazz in Motion</i>",
        "venue": "Brooks &amp; Bates Theatre",
        "intro": "The combos opened and the Big Band closed the fall 2024 season.",
        "pieces": [
            ("", "<i>Bounced</i>", ""),
            ("", "<i>La Shea&rsquo;s Walk</i>", ""),
            ("Stan Kenton", "<i>Opus in Pastels</i>", ""),
            ("Frank Foster", "<i>Shiny Stockings</i>", ""),
            ("", "<i>Bombastic Banana</i>", ""),
            ("Phil Wilson", "<i>Basically Blues</i>", ""),
        ],
        "links": [("Preview in San Angelo LIVE!", "https://sanangelolive.com/news/entertainment/2024-11-12/asu-jazz-ensembles-end-fall-season-free-concert")],
    },
    {
        "id": "percussion-ensemble-2024-11-07", "date": "2024-11-07", "group": "percussion",
        "ensemble": "ASU Percussion Ensemble", "title": "Fall Concert",
        "venue": "Eldon Black Recital Hall",
        "pieces": [
            ("Bob Becker", "<i>Mudra</i>", ""),
            ("Nigel Westlake", "<i>Omphalo Centric Lecture</i>", ""),
            ("Neboj&scaron;a &Zcaron;ivkovi&cacute;", "<i>Trio per Uno</i>", ""),
            ("Joe Porter", "<i>Traveling Carnival</i>", ""),
        ],
        "links": [
            ("Watch the full concert", yt("-pxF15mh5tc")),
            ("Preview in San Angelo LIVE!", "https://sanangelolive.com/node/95208"),
        ],
    },
    {
        "id": "big-band-2024-10-04", "date": "2024-10-04", "group": "jazz",
        "ensemble": "ASU Big Band", "title": "<i>Latin Jazz</i>",
        "venue": "Brooks &amp; Bates Theatre",
        "intro": "Mambo, salsa, samba, and bossa nova to open the fall 2024 season, with guest vocalist Tennley Wilson.",
        "links": [("Preview in San Angelo LIVE!", "https://www.sanangelolive.com/news/san-angelo/2024-10-02/angelo-state-big-band-kick-fall-season-latin-jazz-concert")],
    },
    {
        "id": "percussion-ensemble-2024-04-11", "date": "2024-04-11", "group": "percussion",
        "ensemble": "ASU Percussion Ensemble", "title": "Spring Concert",
        "venue": "Eldon Black Recital Hall",
        "intro": "With guests from the ASU Brass Ensembles.",
        "pieces": [
            ("Russell Hartenberger", "<i>Telisi Odyssey</i>", ""),
            ("Anthony Cirone", "<i>4/4 for Four</i>", ""),
            ("Kirk Gay", "<i>Fear Cage</i>", ""),
            ("Michael Udow", "<i>Reality/Illusion</i>", ""),
            ("Frank Zappa", "<i>The Black Page</i>", ""),
        ],
        "links": [
            ("Watch the full concert", yt("st1PSVkDEv4")),
            ("Preview in San Angelo LIVE!", "https://sanangelolive.com/news/education/2024-04-08/angelo-state-percussion-ensemble-presents-spring-concert"),
        ],
    },
    {
        "id": "jazz-ensemble-2024-02", "date": "2024-02", "group": "jazz",
        "ensemble": "ASU Jazz Ensemble", "title": "<i>A History of Big Band</i>",
        "venue": "Brooks &amp; Bates Theatre",
        "pieces": [
            ("Original Dixieland Jazz Band", "<i>Original Dixieland One Step</i> (1917)", "Arranged by Robert Veen and Ragnar Hellspong"),
            ("Duke Ellington", "<i>Mood Indigo</i> (1930)", "Arranged by Dave Wolpe"),
            ("Cab Calloway", "<i>Minnie the Moocher</i> (1931)", "Arranged by Mike Henebry. Jayden Woodard, vocals"),
            ("Duke Ellington and Juan Tizol", "<i>Caravan</i> (1936)", "Arranged by Mike Tomaro"),
            ("Gordon Goodwin", "<i>Sing Sang Sung</i> (1936, 2001)", ""),
            ("Glenn Miller", "<i>Moonlight Serenade</i> (1939)", "Arranged by Will Hudson"),
            ("Lester Young", "<i>Tickletoe</i> (1940)", "Arranged by Dave Wolpe"),
            ("Lionel Hampton", "<i>Hamps Boogie Woogie</i> (1944)", "Arranged by Edgar Battle"),
            ("Michael League", "<i>Lingus</i> (2013)", "Arranged by Dr. Tim Bonenfant"),
        ],
        "links": [("News story", "https://www.yahoo.com/news/asu-jazz-ensemble-bringing-big-155137348.html")],
    },
    {
        "id": "jazz-combo-2024-02-24", "date": "2024-02-24", "group": "jazz",
        "ensemble": "ASU Jazz Combo", "title": "Jazz Night",
        "venue": "The House of FiFi DuBois",
        "intro": "A combo set with Dr. Shuey on vibraphone, then an open jam session.",
        "links": [("Preview in San Angelo LIVE!", "https://sanangelolive.com/node/88987")],
    },
    {
        "id": "big-band-2023-12-06", "date": "2023-12-06", "group": "jazz",
        "ensemble": "ASU Big Bands I and II", "title": "<i>Have a Swingin&rsquo; Christmas</i>",
        "venue": "Brooks &amp; Bates Theatre",
        "sets": [
            ("Big Band I", [
                ("", "<i>Have Yourself a Merry Little Christmas</i>", ""),
                ("", "<i>Sugar Rum Cherry</i>", ""),
                ("", "<i>Christmas: The Joy and Spirit</i>", ""),
                ("", "<i>Let It Snow!</i>", ""),
                ("", "<i>Blue Christmas</i>", ""),
                ("", "<i>Frosty the Snowman</i>", ""),
                ("", "<i>Tank</i>", ""),
            ]),
            ("Big Band II", [
                ("", "<i>Have a Swingin&rsquo; Christmas</i>", ""),
                ("", "<i>Big Band Christmas</i>", ""),
                ("", "<i>Big Band Christmas II</i>", ""),
                ("", "<i>Christmas Time Is Here</i>", ""),
                ("", "<i>Feliz Navidad</i>", ""),
                ("", "<i>O Christmas Tree</i>", ""),
            ]),
        ],
        "links": [
            ("Watch the full concert", yt("QwkwlbnMkNA")),
            ("Preview in San Angelo LIVE!", "https://sanangelolive.com/node/87040"),
        ],
    },
    {
        "id": "percussion-ensemble-2023-11-30", "date": "2023-11-30", "group": "percussion",
        "ensemble": "ASU Percussion Ensemble", "title": "Fall Concert",
        "venue": "Eldon Black Recital Hall",
        "intro": "With members of the ASU Brass Ensembles.",
        "pieces": [
            ("Mark Ford", "<i>Stubernic</i>", ""),
            ("Brian Justison", "<i>Just Buckets</i>", ""),
            ("Greg A. Steinke", "<i>Flight of Virtuosity for Handclappers</i>", ""),
            ("Mark Ford", "<i>Head Talk</i>", ""),
            ("", "<i>Latin #4</i>", "With the ASU Brass Ensemble"),
            ("", "<i>Fiesta Latina</i>", "With the ASU Brass Ensemble"),
        ],
        "links": [
            ("Watch the full concert", yt("T3GsclmI2Jw")),
            ("Preview in San Angelo LIVE!", "https://sanangelolive.com/news/education/2023-11-28/angelo-state-presents-final-fall-percussion-concert-2023"),
        ],
    },
    {
        "id": "jazz-combo-2023-11-18", "date": "2023-11-18", "group": "jazz",
        "ensemble": "ASU Jazz Combo Two", "title": "Jazz Combo Concert and Jam Session",
        "venue": "The House of FiFi DuBois",
        "personnel": "Taylor Stroope, alto saxophone; Hunter Winans, trumpet; Ramsey McKinney, Jesse Ruiz-Ortiz, and Tristan Reese, trombone; Parker Blevins, piano; Tony Navarro, vibraphone; Jose Baeza, bass; Gregory Heitzenrater, drums.",
    },
    {
        "id": "big-band-2023-10-25", "date": "2023-10-25", "group": "jazz",
        "ensemble": "ASU Big Bands I and II", "title": "Big Band Jazz",
        "venue": "Blue Buffalo Art Gallery",
        "intro": "The first time ASU fielded two big bands, each about 20 players strong.",
        "links": [("Preview in San Angelo LIVE!", "https://sanangelolive.com/news/education/2023-10-23/angelo-state-presents-big-band-jazz-concert")],
    },
    {
        "id": "jazz-2023-09-26", "date": "2023-09-26", "group": "jazz",
        "ensemble": "ASU Big Band and Jazz Combos", "title": "Happy Hour Jazz",
        "venue": "LeGrand Alumni and Visitors Center",
        "intro": "An Angelo State After Hours evening, hosted with Friends of Art and Music Education.",
        "links": [("Preview in San Angelo LIVE!", "https://sanangelolive.com/node/85300")],
    },
    {
        "id": "jazz-combo-2023-03-22", "date": "2023-03-22", "group": "jazz",
        "ensemble": "ASU Jazz Combos", "title": "Jazz Combo Night",
        "venue": "The House of FiFi DuBois",
        "personnel": "Mario Larios-Garcia, Parker Blevins, Avery Bryars, and Rane Robinson, saxophone; Nick Alvarado, trumpet; Corey DeChaine, Jesse Ruiz-Ortiz, and Colby Lehnert, trombone; Mark Wilson Jr. and Jose Baeza, bass; Dr. Trent Shuey, drums.",
    },
    {
        "id": "jazz-combo-2023-02-15", "date": "2023-02-15", "group": "jazz",
        "ensemble": "ASU faculty jazz combo", "title": "Jazz Combo Night",
        "venue": "The House of FiFi DuBois",
        "personnel": "Dr. John Irish, trumpet; Dr. JD Handshoe, trombone; John Taley, piano; Mark Wilson Jr., bass; Dr. Trent Shuey, drums.",
    },
    {
        "id": "jazz-combo-2022-10-26", "date": "2022-10-26", "group": "jazz",
        "ensemble": "ASU Jazz Combos", "title": "Jazz Combo Night",
        "venue": "The House of FiFi DuBois",
        "intro": "An hour-long set by one of the semester's two combos, then an open jam session with the house band.",
    },
    {
        "id": "percussion-ensemble-2022-03-22", "date": "2022-03-22", "group": "percussion",
        "ensemble": "ASU Percussion Ensemble", "title": "Spring Concert",
        "venue": "University Auditorium",
        "intro": "Also featuring Coulter McWilliams and Isaias Torres.",
        "pieces": [
            ("Joe Porter", "<i>Traveling Carnival</i> (2015)", "Opening Night; Sad Clown; Rides, Games and Trickery. Anthony Navarro, vibraphone"),
            ("Elliott Carter", "<i>Saeta</i>", "Jose Gonzales, timpani"),
            ("R&uuml;diger Pawassar", "<i>Sculpture in Wood</i>", ""),
            ("Alan Keown", "<i>The Musical Snare Drummer</i>", ""),
            ("Christopher Rouse", "<i>Bonham</i>", "Destiny Flores, drum set"),
        ],
    },
    {
        "id": "big-band-2021-12-03", "date": "2021-12-03", "group": "jazz",
        "ensemble": "ASU Big Band", "title": "<i>El Mambo!</i>",
        "venue": "ASU Auditorium",
        "links": [("Watch part 1", yt("MmcQ6C1B9BE")), ("Watch part 2", yt("v81R69Rj9dw"))],
    },
    {
        "id": "jazz-combos-2021-11-17", "date": "2021-11-17", "group": "jazz",
        "ensemble": "ASU Jazz Combos", "title": "Jazz Combo Night",
        "venue": "Back Beat Music Company",
        "sets": [
            ("Combo Roscoe", [
                ("Thelonious Monk", "<i>Blue Monk</i>", ""),
                ("Red Hot Chili Peppers", "<i>Dark Necessities</i>", "Arranged by ASU student Will Tipton"),
            ]),
            ("Combo Bella", [("Mongo Santamar&iacute;a", "<i>Afro Blue</i>", ""), ("Paul Desmond", "<i>Take Five</i>", "")]),
            ("Combo Dominic", [
                ("Vernon Duke", "<i>I Can&rsquo;t Get Started</i>", ""),
                ("Horace Silver", "<i>Song for My Father</i>", ""),
            ]),
        ],
    },
]
