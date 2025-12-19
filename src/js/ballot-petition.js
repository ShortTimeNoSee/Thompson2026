const REGISTRAR_DATA = {
  "counties": {
    "Alameda": {"name": "Alameda", "official": "Tim Dupuis, Registrar of Voters", "address": "1225 Fallon Street, Room G-1", "city": "Oakland", "zip": "94612", "phone": "(510) 272-6933", "hours": "8:30 a.m. - 5:00 p.m.", "website": "https://www.acvote.org"},
    "Alpine": {"name": "Alpine", "official": "Teola L. Tremayne, County Clerk", "address": "99 Water Street", "city": "Markleeville", "zip": "96120", "phone": "(530) 694-2281", "hours": "8:30 a.m. - 12:00 p.m. / 1:00 p.m. - 5:00 p.m.", "website": "https://www.alpinecountyca.gov", "email": "ttremayne@alpinecountyca.gov"},
    "Amador": {"name": "Amador", "official": "Kimberly L. Grady, County Clerk", "address": "810 Court Street", "city": "Jackson", "zip": "95642-2132", "phone": "(209) 223-6465", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.amadorgov.org/government/elections", "email": "Elections@amadorgov.org"},
    "Butte": {"name": "Butte", "official": "Keaton Denlay, County Clerk-Recorder/Registrar of Voters", "address": "155 Nelson Ave", "city": "Oroville", "zip": "95965-3411", "phone": "(530) 552-3400, option 1", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://buttevotes.net/35/Elections", "email": "elections@buttecounty.net"},
    "Calaveras": {"name": "Calaveras", "official": "Rebecca Turner, County Clerk/Recorder", "address": "891 Mountain Ranch Road", "city": "San Andreas", "zip": "95249", "phone": "(209) 754-6376", "hours": "8:00 a.m. - 4:00 p.m.", "website": "http://elections.calaverasgov.us", "email": "electionsweb@co.calaveras.ca.us"},
    "Colusa": {"name": "Colusa", "official": "Cristy Jayne Edwards, County Clerk/Recorder/Registrar of Voters", "address": "546 Jay Street, Suite 200", "city": "Colusa", "zip": "95932", "phone": "(530) 458-0500", "hours": "8:30 a.m. - 4:00 p.m.", "website": "http://www.countyofcolusa.org", "email": "clerkinfo@countyofcolusa.org"},
    "Contra Costa": {"name": "Contra Costa", "official": "Kristin Braun Connelly, County Clerk, Recorder and Registrar of Voters", "address": "555 Escobar Street", "city": "Martinez", "zip": "94553", "phone": "(925) 335-7800", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.contracostavote.gov/", "email": "voter.services@vote.cccounty.us"},
    "Del Norte": {"name": "Del Norte", "official": "Alissia Northrup, County Clerk-Recorder", "address": "981 H Street, Room 160", "city": "Crescent City", "zip": "95531", "phone": "(707) 464-7216", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.co.del-norte.ca.us/departments/Elections", "email": "anorthrup@co.del-norte.ca.us"},
    "El Dorado": {"name": "El Dorado", "official": "Linda Webster, Registrar of Voters", "address": "3883 Ponderosa Road", "city": "Shingle Springs", "zip": "95682", "phone": "(530) 621-7480", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.eldoradocounty.ca.gov/County-Government/Elections", "email": "elections@edcgov.us"},
    "Fresno": {"name": "Fresno", "official": "James Kus, County Clerk/Registrar of Voters", "address": "2221 Kern Street", "city": "Fresno", "zip": "93721", "phone": "(559) 600-8683", "hours": "8:30 a.m. - 5:00 p.m.", "website": "https://www.fresnocountyca.gov/Departments/County-ClerkRegistrar-of-Voters", "email": "clerk-elections@fresnocountyca.gov"},
    "Glenn": {"name": "Glenn", "official": "Sendy Perez, County Assessor/Clerk-Recorder/Elections", "address": "516 W. Sycamore Street, 2nd Floor", "city": "Willows", "zip": "95988", "phone": "(530) 934-6414", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.countyofglenn.net/dept/elections/welcome", "email": "elections@countyofglenn.net"},
    "Humboldt": {"name": "Humboldt", "official": "Juan Pablo Cervantes, County Clerk, Recorder and Registrar of Voters", "address": "2426 6th Street", "city": "Eureka", "zip": "95501", "phone": "(707) 445-7481", "hours": "8:30 a.m. - 12:00 p.m. / 1:00 p.m. - 5:00 p.m.", "website": "https://humboldtgov.org/890/Elections-Voter-Registration", "email": "humboldt_elections@co.humboldt.ca.us"},
    "Imperial": {"name": "Imperial", "official": "Linsey J. Dale, Registrar of Voters", "address": "940 W. Main Street, Suite 206", "city": "El Centro", "zip": "92243", "phone": "(442) 265-1060", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://elections.imperialcounty.org/", "email": "linseydale@co.imperial.ca.us"},
    "Inyo": {"name": "Inyo", "official": "Danielle Sexton, Clerk/Recorder & Registrar of Voters", "address": "168 N. Edwards Street", "city": "Independence", "zip": "93526", "phone": "(760) 878-0224", "hours": "8:00 a.m. - 12:00 p.m. / 1:00 p.m. - 5:00 p.m.", "website": "https://elections.inyocounty.us", "email": "dsexton@inyocounty.us"},
    "Kern": {"name": "Kern", "official": "Aimee X. Espinoza, Auditor-Controller/County Clerk/Registrar of Voters", "address": "1115 Truxtun Avenue, First Floor", "city": "Bakersfield", "zip": "93301", "phone": "(661) 868-3590", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.kernvote.com", "email": "elections@kerncounty.com"},
    "Kings": {"name": "Kings", "official": "Lupe Villa, Registrar of Voters", "address": "1400 W. Lacey Blvd. Bldg. #7", "city": "Hanford", "zip": "93230", "phone": "(559) 852-4401", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.countyofkings.com/departments/administration/elections", "email": "Elections@Countyofkings.com"},
    "Lake": {"name": "Lake", "official": "Maria Valadez, Registrar of Voters", "address": "325 N. Forbes Street", "city": "Lakeport", "zip": "95453", "phone": "(707) 263-2372", "hours": "Monday - Friday: 8:00 a.m. - 5:00 p.m.", "website": "https://www.lakecountyca.gov/818/Registrar-of-Voters", "email": "elections@lakecountyca.gov"},
    "Lassen": {"name": "Lassen", "official": "Julie Bustamante, County Clerk-Recorder", "address": "220 S. Lassen Street, Suite 5", "city": "Susanville", "zip": "96130", "phone": "(530) 251-8217", "hours": "9:00 a.m. - 12:00 p.m. / 1:00 p.m. - 4:00 p.m.", "website": "http://www.lassencounty.org/dept/county-clerk-recorder/elections/", "email": "lcclerk@co.lassen.ca.us"},
    "Los Angeles": {"name": "Los Angeles", "official": "Dean Logan, Registrar - Recorder/County Clerk", "address": "12400 Imperial Hwy.", "city": "Norwalk", "zip": "90650", "phone": "(800) 815-2666", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.lavote.gov/home/voting-elections", "email": "voterinfo@rrcc.lacounty.gov"},
    "Madera": {"name": "Madera", "official": "Rebecca Martinez, Clerk/Recorder/ROV", "address": "200 W. 4th Street", "city": "Madera", "zip": "93637", "phone": "(559) 675-7720", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://votemadera.com", "email": "electionsinfo@maderacounty.com"},
    "Marin": {"name": "Marin", "official": "Natalie Adona, Registrar of Voters", "address": "3501 Civic Center Drive, Room 121", "city": "San Rafael", "zip": "94903", "phone": "(415) 473-6456", "hours": "8:00 a.m. - 4:30 p.m.", "website": "https://www.marincounty.gov/departments/elections", "email": "elections@marincounty.gov"},
    "Mariposa": {"name": "Mariposa", "official": "Courtney Progner Morrow, Registrar of Voters", "address": "4982 10th Street", "city": "Mariposa", "zip": "95338", "phone": "(209) 966-2007", "hours": "8:00 a.m. - 5:00 p.m.", "website": "http://www.mariposacounty.org/87/Elections", "email": "cmorrow@mariposacounty.org"},
    "Mendocino": {"name": "Mendocino", "official": "Katrina Bartolomie, Assessor-County Clerk-Recorder", "address": "501 Low Gap Road, Room 1020", "city": "Ukiah", "zip": "95482", "phone": "(707) 234-6819", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.mendocinocounty.org/government/assessor-county-clerk-recorder-elections/elections", "email": "acr@co.mendocino.ca.us"},
    "Merced": {"name": "Merced", "official": "Melvin E. Levey, Registrar of Voters", "address": "2222 M Street", "city": "Merced", "zip": "95340", "phone": "(209) 385-7541", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.countyofmerced.com/3878/Elections", "email": "elections@countyofmerced.com"},
    "Modoc": {"name": "Modoc", "official": "Stephanie Wellemeyer, County Auditor/Clerk/Recorder", "address": "108 E. Modoc Street", "city": "Alturas", "zip": "96101", "phone": "(530) 233-6200", "hours": "8:30 a.m. - 12:00 p.m. / 1:00 p.m. - 5:00 p.m.", "website": "http://www.co.modoc.ca.us/departments/elections", "email": "clerkelections@co.modoc.ca.us"},
    "Mono": {"name": "Mono", "official": "Queenie Barnard, Clerk – Recorder – Registrar", "address": "74 N. School Street, Annex I", "city": "Bridgeport", "zip": "93517", "phone": "(760) 932-5537", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://monocounty.ca.gov/elections", "email": "elections@mono.ca.gov"},
    "Monterey": {"name": "Monterey", "official": "Gina Martinez, Registrar of Voters", "address": "1441 Schilling Place - North Building", "city": "Salinas", "zip": "93901", "phone": "(831) 796-1499", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.montereycountyelections.us", "email": "elections@co.monterey.ca.us"},
    "Napa": {"name": "Napa", "official": "John Tuteur, Assessor-Recorder-County Clerk", "address": "1125 Third St., First Floor", "city": "Napa", "zip": "94559", "phone": "(707) 253-4321", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.countyofnapa.org/396/Elections", "email": "elections@countyofnapa.org"},
    "Nevada": {"name": "Nevada", "official": "Armando Salud-Ambriz, Clerk-Recorder/Registrar of Voters", "address": "950 Maidu Avenue, Suite 210", "city": "Nevada City", "zip": "95959", "phone": "(530) 265-1298", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.nevadacountyca.gov/3446/Elections", "email": "elections.mail@nevadacountyca.gov"},
    "Orange": {"name": "Orange", "official": "Bob Page, Registrar of Voters", "address": "1300 South Grand Avenue, Bldg. C", "city": "Santa Ana", "zip": "92705", "phone": "(714) 567-7600", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://ocvote.gov", "email": "ocvoter@ocgov.com"},
    "Placer": {"name": "Placer", "official": "Ryan Ronco, County Clerk-Recorder-Registrar", "address": "3715 Atherton Rd.", "city": "Rocklin", "zip": "95765", "phone": "(530) 886-5650", "hours": "8:00 a.m. - 5:00 p.m.", "website": "http://www.placercountyelections.gov", "email": "election@placer.ca.gov"},
    "Plumas": {"name": "Plumas", "official": "Marcy DeMartile, County Clerk-Recorder-Registrar of Voters", "address": "520 Main Street, Room 102, Courthouse", "city": "Quincy", "zip": "95971", "phone": "(530) 283-6256", "hours": "8:00 a.m. - 5:00 p.m.", "website": "http://www.countyofplumas.com/142/Elections-Division-Home", "email": "elections@countyofplumas.com"},
    "Riverside": {"name": "Riverside", "official": "Art Tinoco, Registrar of Voters", "address": "2724 Gateway Drive", "city": "Riverside", "zip": "92507-0918", "phone": "(951) 486-7200", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.voteinfo.net", "email": "rovweb@rivco.org"},
    "Sacramento": {"name": "Sacramento", "official": "Hang Nguyen, Registrar of Voters", "address": "7000 65th Street, Suite A", "city": "Sacramento", "zip": "95823", "phone": "(916) 875-6451", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://elections.saccounty.gov/Pages/default.aspx", "email": "voterinfo@saccounty.gov"},
    "San Benito": {"name": "San Benito", "official": "Francisco Diaz, County Clerk-Auditor-Recorder", "address": "1601 Lana Way", "city": "Hollister", "zip": "95023", "phone": "(831) 636-4016", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.sanbenitocounty-ca-cre.gov/", "email": "sbcvote@sanbenitocountyca.gov"},
    "San Bernardino": {"name": "San Bernardino", "official": "Joani Finwall, Registrar of Voters", "address": "777 E. Rialto Avenue", "city": "San Bernardino", "zip": "92415-0770", "phone": "(909) 387-8300", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://elections.sbcounty.gov/", "email": "communications@rov.sbcounty.gov"},
    "San Diego": {"name": "San Diego", "official": "Cynthia Paes, Registrar of Voters", "address": "5600 Overland Avenue", "city": "San Diego", "zip": "92123", "phone": "(858) 565-5800", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.sdvote.com", "email": "rovmail@sdcounty.ca.gov"},
    "San Francisco": {"name": "San Francisco", "official": "John Arntz, Director of Elections", "address": "1 Dr. Carlton B Goodlett Place, City Hall, Room 48", "city": "San Francisco", "zip": "94102-4635", "phone": "(415) 554-4375", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://sf.gov/departments/department-elections", "email": "sfvote@sfgov.org"},
    "San Joaquin": {"name": "San Joaquin", "official": "Olivia Hale, Registrar of Voters", "address": "44 N. San Joaquin Street, Third Floor, Suite 350", "city": "Stockton", "zip": "95202", "phone": "(209) 468-8683", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.sjgov.org/department/rov/", "email": "vbm@sjgov.org"},
    "San Luis Obispo": {"name": "San Luis Obispo", "official": "Elaina Cano, Clerk-Recorder-Registrar", "address": "1055 Monterey Street, Suite D-120", "city": "San Luis Obispo", "zip": "93408", "phone": "(805) 781-5228", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.slocounty.ca.gov/Departments/Clerk-Recorder", "email": "elections@co.slo.ca.us"},
    "San Mateo": {"name": "San Mateo", "official": "Mark Church, Chief Elections Officer & Assessor-County Clerk-Recorder", "address": "40 Tower Road", "city": "San Mateo", "zip": "94402", "phone": "(650) 312-5222", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://smcacre.gov/elections", "email": "registrar@smcacre.gov"},
    "Santa Barbara": {"name": "Santa Barbara", "official": "Joseph E. Holland, Clerk/Recorder/Assessor and Registrar of Voters", "address": "4440-A Calle Real", "city": "Santa Barbara", "zip": "93110", "phone": "(805) 568-2200", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.countyofsb.org/164/Elections", "email": "electionssupport@co.santa-barbara.ca.us"},
    "Santa Clara": {"name": "Santa Clara", "official": "Matt Moreles, ROV", "address": "1555 Berger Drive, Bldg. 2", "city": "San Jose", "zip": "95112", "phone": "(408) 299-8683", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://vote.santaclaracounty.gov/home", "email": "registrar@rov.sccgov.org"},
    "Santa Cruz": {"name": "Santa Cruz", "official": "Tricia Webber, County Clerk", "address": "701 Ocean Street, Room 310", "city": "Santa Cruz", "zip": "95060", "phone": "(831) 454-2060", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://votescount.santacruzcountyca.gov/", "email": "tricia.webber@santacruzcountyca.gov"},
    "Shasta": {"name": "Shasta", "official": "Clint Curtis, Clerk & Registrar of Voters", "address": "1643 Market Street", "city": "Redding", "zip": "96001", "phone": "(530) 225-5730", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://elections.shastacounty.gov/", "email": "countyclerk@co.shasta.ca.us"},
    "Sierra": {"name": "Sierra", "official": "Heather Foster, County Clerk-Recorder", "address": "100 Courthouse Square, Room 11", "city": "Downieville", "zip": "95936-0398", "phone": "(530) 289-3295", "hours": "9:00 a.m. - 12:00 p.m. / 1:00 p.m. - 4:00 p.m.", "website": "https://www.sierracounty.ca.gov/214/Elections", "email": "hfoster@sierracounty.ca.gov"},
    "Siskiyou": {"name": "Siskiyou", "official": "Laura Bynum, County Clerk", "address": "311 Fourth Street, Room 201", "city": "Yreka", "zip": "96097", "phone": "(530) 842-8084", "hours": "9:00 a.m. - 12:00 p.m. / 1:00 p.m. - 4:00 p.m.", "website": "https://www.co.siskiyou.ca.us/elections", "email": "laura@sisqvotes.org"},
    "Solano": {"name": "Solano", "official": "Timothy Flanagan, Registrar of Voters", "address": "675 Texas Street, Suite 2600", "city": "Fairfield", "zip": "94533", "phone": "(707) 784-6675", "hours": "8:00 a.m. - 5:00 p.m.", "website": "http://www.solanocounty.com/depts/rov/default.asp", "email": "elections@solanocounty.com"},
    "Sonoma": {"name": "Sonoma", "official": "Evelyn Mendez, Registrar of Voters", "address": "435 Fiscal Drive", "city": "Santa Rosa", "zip": "95403", "phone": "(707) 565-6800", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://sonomacounty.ca.gov/administrative-support-and-fiscal-services/clerk-recorder-assessor-registrar-of-voters/registrar-of-voters", "email": "rov-info@sonomacounty.gov"},
    "Stanislaus": {"name": "Stanislaus", "official": "Donna Linder, County Clerk-Recorder", "address": "1021 I Street, Suite 101", "city": "Modesto", "zip": "95354-2331", "phone": "(209) 525-5200", "hours": "8:00 a.m. - 4:00 p.m.", "website": "http://stanvote.gov", "email": "stanvote@stancounty.com"},
    "Sutter": {"name": "Sutter", "official": "Donna M. Johnston, County Clerk-Recorder", "address": "1435 Veterans Memorial Circle", "city": "Yuba City", "zip": "95993", "phone": "(530) 822-7122", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.suttercounty.org/doc/government/depts/cr/elections/cr_elections_home"},
    "Tehama": {"name": "Tehama", "official": "Sean Houghtby, Registrar of Voters", "address": "633 Washington Street, Room 17", "city": "Red Bluff", "zip": "96080", "phone": "(530) 527-8190", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.co.tehama.ca.us/government/departments/elections/", "email": "elections@tehama.gov"},
    "Trinity": {"name": "Trinity", "official": "Shanna White, Registrar of Voters", "address": "11 Court Street", "city": "Weaverville", "zip": "96093", "phone": "(530) 623-1220", "hours": "9:00 a.m. - 1:00 p.m, 2:00 p.m. - 4:00 p.m.", "website": "https://www.trinitycounty.org/214/Elections", "email": "elections@trinitycounty.org"},
    "Tulare": {"name": "Tulare", "official": "Michelle Baldwin, Registrar of Voters", "address": "5300 West Tulare Avenue, Suite 105", "city": "Visalia", "zip": "93277", "phone": "(559) 839-2100", "hours": "M-Th 7:30 a.m. - 5:30 p.m., F 8:00 a.m. - 12:00 p.m.", "website": "https://tularecoelections.org/elections", "email": "absentee@co.tulare.ca.us"},
    "Tuolumne": {"name": "Tuolumne", "official": "Donny McNair, Clerk & Auditor-Controller", "address": "2 S. Green Street", "city": "Sonora", "zip": "95370-4618", "phone": "(209) 533-5570", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.tuolumnecounty.ca.gov/194/Election-Information", "email": "clerk@tuolumnecounty.ca.gov"},
    "Ventura": {"name": "Ventura", "official": "Michelle Ascencion, County Clerk-Recorder-Registrar of Voters", "address": "800 S. Victoria Avenue, Hall of Administration, Lower Plaza", "city": "Ventura", "zip": "93009-1200", "phone": "(805) 654-2664", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://vote.venturacounty.gov/", "email": "elections@venturacounty.gov"},
    "Yolo": {"name": "Yolo", "official": "Jesse Salinas, Yolo County Assessor/Clerk-Recorder/Registrar of Voters", "address": "625 Court Street, Room B-05", "city": "Woodland", "zip": "95695", "phone": "(530) 666-8133", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://elections.yolocounty.gov/", "email": "elections@yolocounty.gov"},
    "Yuba": {"name": "Yuba", "official": "Donna Hillegass, County Clerk-Recorder-Registrar of Voters", "address": "915 8th Street, Suite 107", "city": "Marysville", "zip": "95901-5273", "phone": "(530) 749-7855", "hours": "8:00 a.m. - 5:00 p.m.", "website": "https://www.yuba.org/departments/elections/index.php", "email": "elections@co.yuba.ca.us"}
  }
};

class BallotPetitionComponent {
    constructor() {
        this.selectedCounty = null;
        this.countyData = null;
    }

    initialize() {
        this.populateCountyDropdown();
        this.setupEventListeners();
    }

    populateCountyDropdown() {
        const select = document.getElementById('county-select');
        if (!select) return;

        const counties = Object.keys(REGISTRAR_DATA.counties).sort();
        counties.forEach(county => {
            const option = document.createElement('option');
            option.value = county;
            option.textContent = county;
            select.appendChild(option);
        });
    }

    setupEventListeners() {
        const countySelect = document.getElementById('county-select');
        const countySubmit = document.getElementById('county-submit');
        const changeCountyBtn = document.getElementById('change-county-btn');

        if (countySelect) {
            countySelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    countySubmit.disabled = false;
                    this.selectedCounty = e.target.value;
                    this.countyData = REGISTRAR_DATA.counties[e.target.value];
                } else {
                    countySubmit.disabled = true;
                }
            });
        }

        if (countySubmit) {
            countySubmit.addEventListener('click', () => {
                this.showInstructions();
            });
        }

        if (changeCountyBtn) {
            changeCountyBtn.addEventListener('click', () => {
                this.resetToCountySelection();
            });
        }
    }

    showInstructions() {
        if (!this.countyData) return;

        const countySelector = document.getElementById('county-selector');
        const instructionsSection = document.getElementById('instructions-section');

        countySelector.classList.add('hidden');
        instructionsSection.classList.remove('hidden');

        this.updateSteps(2);
        this.populateRegistrarInfo();
        this.populateInstructions();

        instructionsSection.scrollIntoView({ behavior: 'smooth' });
    }

    resetToCountySelection() {
        const countySelector = document.getElementById('county-selector');
        const instructionsSection = document.getElementById('instructions-section');

        instructionsSection.classList.add('hidden');
        countySelector.classList.remove('hidden');

        this.updateSteps(1);

        document.getElementById('county-select').value = '';
        document.getElementById('county-submit').disabled = true;

        countySelector.scrollIntoView({ behavior: 'smooth' });
    }

    updateSteps(currentStep) {
        const steps = document.querySelectorAll('.step');
        steps.forEach((step, index) => {
            if (index + 1 === currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }

    populateRegistrarInfo() {
        if (!this.countyData) return;

        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${this.countyData.address}, ${this.countyData.city}, CA ${this.countyData.zip}`
        )}`;

        document.getElementById('registrar-name').textContent = `${this.countyData.name} County Elections Office`;
        document.getElementById('registrar-official').textContent = this.countyData.official;
        document.getElementById('registrar-street').textContent = this.countyData.address;
        document.getElementById('registrar-city').textContent = `${this.countyData.city}, CA ${this.countyData.zip}`;
        document.getElementById('registrar-phone').textContent = `Phone: ${this.countyData.phone}`;
        document.getElementById('registrar-hours').textContent = `Hours: ${this.countyData.hours}`;
        
        const websiteLink = document.getElementById('registrar-website');
        websiteLink.href = this.countyData.website;
        
        const mapsLink = document.getElementById('registrar-maps');
        mapsLink.href = mapsUrl;
    }

    populateInstructions() {
        if (!this.countyData) return;

        const countyNameDisplay = document.getElementById('county-name-display');
        const countyEmphasis = document.querySelectorAll('.county-emphasis');
        const dropoffAddress = document.getElementById('dropoff-address-repeat');
        const officeHours = document.getElementById('office-hours-repeat');

        if (countyNameDisplay) {
            countyNameDisplay.textContent = this.countyData.name;
        }

        countyEmphasis.forEach(el => {
            el.textContent = `${this.countyData.name} County`;
        });

        if (dropoffAddress) {
            dropoffAddress.innerHTML = `
                <strong>${this.countyData.name} County Elections Office</strong><br>
                ${this.countyData.address}<br>
                ${this.countyData.city}, CA ${this.countyData.zip}
            `;
        }

        if (officeHours) {
            officeHours.textContent = this.countyData.hours;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('petition-interactive')) {
        const component = new BallotPetitionComponent();
        component.initialize();
    }
});

