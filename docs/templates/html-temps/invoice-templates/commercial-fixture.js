const COMMERCIAL_DATA = {
  "issuer": {
    "name": "Kestrel Industrial Supply Ltd",
    "rc": "RC 1928374",
    "tin": "TIN 20384756-0001",
    "tagline": "Engineering the backbone of industry",
    "addr": "Plot 14, Block C, Agbara Industrial Estate, Agbara, Ogun State, Nigeria",
    "addr_short": "Plot 14, Block C, Agbara Industrial Estate, Ogun State",
    "phone": "+234 800 555 0142",
    "email": "sales@kestrel-industrial.example",
    "web": "www.kestrel-industrial.example"
  },
  "client": {
    "name": "Northgate Foods Processing Nigeria Ltd",
    "addr": "Km 18, Lagos–Ibadan Expressway, Mowe, Ogun State, Nigeria",
    "contact": "Ms. Adaeze Obi — Procurement Lead",
    "phone": "+234 800 555 0177",
    "email": "procurement@northgate-foods.example",
    "tin": "TIN 31827465-0001"
  },
  "models": {
    "inv": {
      "kind": "inv",
      "title": "INVOICE",
      "invoice_title": "Materials, Equipment & Supplies — Phase 2",
      "number": "INV-2026-0147",
      "pricehead": "Unit Price (₦)",
      "party_label": "Bill To · Client",
      "grouped": true,
      "rows": [
        {
          "kind": "item",
          "n": 1,
          "name": "Portland-limestone cement CEM II 42.5R",
          "make": "Dangote-grade bulk supply (synthetic spec)",
          "spec": "50 kg bags, palletised<br><i>Delivery in 4 tranches</i>",
          "qty": "1,200",
          "unit": "bags",
          "price": "10,400.00",
          "amount": "12,480,000.00",
          "img": "assets/products/brick-wall.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"4\" y=\"6\" width=\"16\" height=\"12\" rx=\"2\" /><path d=\"M8 6v12M16 6v12M4 12h16\" /></svg>"
        },
        {
          "kind": "item",
          "n": 2,
          "name": "High-yield deformed reinforcement bar Y16",
          "make": "BS 4449:2005 Grade B500B",
          "spec": "12 m lengths, mill-certified<br>Bundled &amp; tagged by heat number<br>Delivery tolerance ±2% on tonnage; weighbridge tickets supplied with every load",
          "qty": "85",
          "unit": "tonnes",
          "price": "1,150,000.00",
          "amount": "97,750,000.00",
          "img": "assets/products/construction.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"2\" /><path d=\"M9 9h6v6H9z\" /></svg>"
        },
        {
          "kind": "item",
          "n": 3,
          "name": "Hot-dip galvanised structural I-beam IPE 300",
          "make": "S275JR — EN 10025",
          "spec": "12 m lengths; <b>galvanised to ISO 1461</b><br>Mill test certificates supplied<br><i>Optional:</i> primer plus two-coat polyurethane finish available on request",
          "qty": "42",
          "unit": "pcs",
          "price": "486,500.00",
          "amount": "20,433,000.00",
          "img": null,
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M12 3v18M8 8h8M8 16h8\" /></svg>"
        },
        {
          "kind": "group",
          "title": "Electrical — Power Cables & Distribution",
          "subtotal": "57,108,000.00"
        },
        {
          "kind": "item",
          "n": 4,
          "name": "Armoured power cable 4-core 95 mm² Cu/XLPE/SWA/PVC",
          "make": "0.6/1 kV — BS 5467",
          "spec": "Drum length 250 m; <b>cut-to-length</b> on request<br>Supplied on returnable steel drums",
          "qty": "1,500",
          "unit": "m",
          "price": "28,400.00",
          "amount": "42,600,000.00",
          "img": "assets/products/cable.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"2\" /><path d=\"M4 9h16M9 9v11\" /></svg>"
        },
        {
          "kind": "item",
          "n": 5,
          "name": "Main LV distribution board, 800 A, TPN, 36-way",
          "make": "Form 2b, IP54 floor-standing",
          "spec": "Powder-coated 2 mm sheet steel, 800 A copper busbar<br>Incl. neutral &amp; earth bars; type-tested to IEC 61439<br>Factory-wired with surge protection and metering CT provisions",
          "qty": "6",
          "unit": "pcs",
          "price": "1,850,000.00",
          "amount": "11,100,000.00",
          "img": "assets/products/zap.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"2\" y=\"6\" width=\"20\" height=\"12\" rx=\"2\" /><path d=\"M6 12h2M10 12h2M14 12h2M18 12h2\" /></svg>"
        },
        {
          "kind": "item",
          "n": 6,
          "name": "MCCB 3-pole 250 A, 36 kA",
          "make": "Adjustable thermal-magnetic trip",
          "spec": "Breaking capacity 36 kA @ 415 V; rotary handle, terminal shrouds &amp; auxiliary contact included",
          "qty": "24",
          "unit": "pcs",
          "price": "142,000.00",
          "amount": "3,408,000.00",
          "img": "assets/products/plug-zap.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\" /><path d=\"M7 15h10M12 5v10\" /></svg>"
        },
        {
          "kind": "item",
          "n": 7,
          "name": "Centrifugal end-suction pump set, 7.5 kW",
          "make": "50 m³/h @ 32 m head — cast-iron volute",
          "spec": "<b>Set includes:</b> 3-phase motor, baseplate, coupling guard, flexible couplings<br><i>2-year manufacturer warranty</i>",
          "qty": "4",
          "unit": "sets",
          "price": "1,420,000.00",
          "amount": "5,680,000.00",
          "img": "assets/products/cog.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><circle cx=\"12\" cy=\"12\" r=\"6\" /><path d=\"M12 6v6l4 2\" /></svg>"
        },
        {
          "kind": "item",
          "n": 8,
          "name": "Axial roof ventilation fan 900 mm, 1.1 kW",
          "make": "IP55, 3-phase, backdraught shutter",
          "spec": "Galvanised housing; 18,500 m³/h",
          "qty": "12",
          "unit": "pcs",
          "price": "385,000.00",
          "amount": "4,620,000.00",
          "img": "assets/products/fan.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><circle cx=\"12\" cy=\"12\" r=\"4\" /><path d=\"M12 2v4M12 18v4M2 12h4M18 12h4\" /></svg>"
        },
        {
          "kind": "item",
          "n": 9,
          "name": "Three-phase induction motor 15 kW, IE3, 4-pole, B3",
          "make": "Foot-mounted, 400 V / 50 Hz",
          "spec": "Class F insulation; IP55; with PTC thermistors",
          "qty": "6",
          "unit": "pcs",
          "price": "920,000.00",
          "amount": "5,520,000.00",
          "img": null,
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><circle cx=\"12\" cy=\"12\" r=\"8\" /><circle cx=\"12\" cy=\"12\" r=\"2\" /><path d=\"M12 4v4M12 16v4M4 12h4M16 12h4\" /></svg>"
        },
        {
          "kind": "item",
          "n": 10,
          "name": "V-belt, pulley &amp; coupling accessory kit",
          "make": "Assorted B-section",
          "spec": null,
          "qty": "30",
          "unit": "lots",
          "price": "38,500.00",
          "amount": "1,155,000.00",
          "img": "assets/products/wrench.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"4\" y=\"10\" width=\"16\" height=\"4\" rx=\"1\" /><path d=\"M6 14v4M18 14v4\" /></svg>"
        },
        {
          "kind": "group",
          "title": "Plumbing & Sanitary Materials",
          "subtotal": "9,481,000.00"
        },
        {
          "kind": "item",
          "n": 11,
          "name": "uPVC pressure pipe 110 mm, PN10",
          "make": "6 m socketed lengths — water supply",
          "spec": "Solvent-weld or rubber-ring joint; includes 10% fitting allowance",
          "qty": "320",
          "unit": "lengths",
          "price": "18,600.00",
          "amount": "5,952,000.00",
          "img": "assets/products/droplets.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M4 8h16v8H4z\" /><path d=\"M8 8v8M16 8v8\" /></svg>"
        },
        {
          "kind": "item",
          "n": 12,
          "name": "Cast-iron flanged gate valve DN100, PN16",
          "make": "Resilient-seated, non-rising stem",
          "spec": "Epoxy-coated body; handwheel operated; PN16 drilled flanges",
          "qty": "18",
          "unit": "pcs",
          "price": "96,500.00",
          "amount": "1,737,000.00",
          "img": "assets/products/settings-2.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M12 4v16M8 8h8M8 16h8\" /></svg>"
        },
        {
          "kind": "item",
          "n": 13,
          "name": "Industrial sanitary suite — floor-mounted WC with cistern &amp; wall-hung basin",
          "make": "Vitreous china, white",
          "spec": "Complete with seat, 15 mm angle valves, flexible connectors &amp; waste fittings<br><b>Includes</b> installation pack",
          "qty": "14",
          "unit": "sets",
          "price": "128,000.00",
          "amount": "1,792,000.00",
          "img": "assets/products/toilet.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M6 10h12v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6zM9 10V6h6v4\" /></svg>"
        },
        {
          "kind": "item",
          "n": 14,
          "name": "Safety helmet (hard hat), 6-point ratchet",
          "make": "HDPE shell — EN 397",
          "spec": "Colour-coded by trade: white / yellow / blue",
          "qty": "180",
          "unit": "pcs",
          "price": "4,200.00",
          "amount": "756,000.00",
          "img": "assets/products/hard-hat.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M7 8h10v12H7zM9 8V5h6v3\" /></svg>"
        },
        {
          "kind": "item",
          "n": 15,
          "name": "Safety boots, steel toe-cap &amp; midsole, S3",
          "make": "Oil-resistant PU outsole — sizes 39–46",
          "spec": "Supplied in a size run agreed with site HSE",
          "qty": "180",
          "unit": "pairs",
          "price": "31,500.00",
          "amount": "5,670,000.00",
          "img": "assets/products/footprints.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M4 18L20 6M4 12L20 0M8 22L24 10\" /></svg>"
        },
        {
          "kind": "group",
          "title": "Computers & IT Equipment",
          "subtotal": "22,260,000.00"
        },
        {
          "kind": "item",
          "n": 16,
          "name": "Desktop workstation, Core i7 / 16 GB / 512 GB NVMe, with 24″ monitor",
          "make": "Business-class tower, Windows 11 Pro",
          "spec": "<b>Specification:</b> 12th-gen Core i7, 16 GB DDR4, 512 GB NVMe SSD, 24″ FHD IPS monitor, keyboard &amp; mouse<br>3-year on-site warranty<br><b>Included:</b> Windows 11 Pro licence, wired keyboard &amp; optical mouse, power cable<br>Pre-imaged with the client’s standard software build; asset-tagged on delivery<br>Rated for 24/7 operation up to 35 °C ambient",
          "qty": "20",
          "unit": "units",
          "price": "865,000.00",
          "amount": "17,300,000.00",
          "img": "assets/products/monitor.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M12 3a9 9 0 0 0-9 9h18a9 9 0 0 0-9-9zM12 3v9\" /></svg>"
        },
        {
          "kind": "item",
          "n": 17,
          "name": "Managed 48-port Gigabit PoE+ switch with 4 × 10G SFP+ uplinks",
          "make": "Layer 3 lite; rack-mount 1U",
          "spec": "740 W PoE budget; includes rack ears &amp; console cable<br>Dual hot-swap PSU bays (one fitted); front-to-back airflow<br>Supports 802.1X, LACP, IGMP snooping, VLAN and QoS<br>Includes 4 × SFP+ direct-attach cables, 1 m",
          "qty": "4",
          "unit": "pcs",
          "price": "1,240,000.00",
          "amount": "4,960,000.00",
          "img": "assets/products/router.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M6 18v-4h12v4M8 14V8h8v6\" /></svg>"
        },
        {
          "kind": "group",
          "title": "Electrical — Power Systems & Lighting",
          "subtotal": "17,660,400.00"
        },
        {
          "kind": "item",
          "n": 18,
          "name": "Online double-conversion UPS 10 kVA, 3-phase in / 1-phase out",
          "make": "Rack/tower convertible, with 15-min battery bank",
          "spec": "True online topology; <b>N+1 parallel-ready</b>; SNMP card included<br>Battery: 20 × 12 V 9 Ah sealed lead-acid",
          "qty": "3",
          "unit": "units",
          "price": "2,350,000.00",
          "amount": "7,050,000.00",
          "img": "assets/products/battery-charging.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"3\" y=\"8\" width=\"18\" height=\"10\" rx=\"2\" /><path d=\"M7 8V6h10v2\" /></svg>"
        },
        {
          "kind": "item",
          "n": 19,
          "name": "LED high-bay light 150 W, IP65",
          "make": "5000 K, 120 lm/W, 90° optic",
          "spec": "Aluminium heat-sink body; 5-year warranty",
          "qty": "120",
          "unit": "pcs",
          "price": "38,500.00",
          "amount": "4,620,000.00",
          "img": "assets/products/lightbulb.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"2\" y=\"6\" width=\"20\" height=\"12\" rx=\"1\" /><path d=\"M6 6v12M10 6v12M14 6v12M18 6v12\" /></svg>"
        },
        {
          "kind": "item",
          "n": 20,
          "name": "LED recessed panel 600 × 600 mm, 40 W",
          "make": "4000 K, UGR&lt;19",
          "spec": null,
          "qty": "200",
          "unit": "pcs",
          "price": "16,800.00",
          "amount": "3,360,000.00",
          "img": "assets/products/lamp.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"6\" y=\"4\" width=\"12\" height=\"16\" rx=\"4\" /><path d=\"M9 4v16\" /></svg>"
        },
        {
          "kind": "item",
          "n": 21,
          "name": "LED emergency exit sign, 3-hour battery backup",
          "make": "Maintained / non-maintained selectable",
          "spec": null,
          "qty": "36",
          "unit": "pcs",
          "price": "14,900.00",
          "amount": "536,400.00",
          "img": null,
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><circle cx=\"12\" cy=\"12\" r=\"4\" /><path d=\"M12 2v4M12 18v4M2 12h4M18 12h4\" /></svg>"
        },
        {
          "kind": "item",
          "n": 22,
          "name": "Heavy-gauge PVC conduit 25 mm with standard junction boxes, saddles, bends and couplers (assorted)",
          "make": "BS EN 61386 — 3 m lengths",
          "spec": "Lengths priced individually; accessories supplied at the ratio 1 : 1",
          "qty": "800",
          "unit": "lengths",
          "price": "1,350.00",
          "amount": "1,080,000.00",
          "img": null,
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"2\" /><path d=\"M8 8h8v8H8z\" /></svg>"
        },
        {
          "kind": "item",
          "n": 23,
          "name": "13 A twin switched socket outlet, flush-mount, IP20",
          "make": "White, with 2 × USB-A charging ports",
          "spec": null,
          "qty": "260",
          "unit": "pcs",
          "price": "3,900.00",
          "amount": "1,014,000.00",
          "img": "assets/products/plug-zap.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><circle cx=\"12\" cy=\"12\" r=\"5\" /><path d=\"M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41\" /></svg>"
        },
        {
          "kind": "group",
          "title": "Safety Equipment & PPE",
          "subtotal": "2,596,000.00"
        },
        {
          "kind": "item",
          "n": 24,
          "name": "Fire extinguisher 9 kg ABC dry-powder, with wall bracket",
          "make": "Rated 55A/233B — EN 3-7",
          "spec": "Annual service tag included<br><b>Includes</b> 1 × signage plate per unit",
          "qty": "40",
          "unit": "pcs",
          "price": "44,000.00",
          "amount": "1,760,000.00",
          "img": "assets/products/fire-extinguisher.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"1\" /><path d=\"M8 4v16M12 4v16M16 4v16\" /></svg>"
        },
        {
          "kind": "item",
          "n": 25,
          "name": "High-visibility reflective vest, class 2",
          "make": "EN ISO 20471 — 120 gsm",
          "spec": "Zip front, 2 pockets; sizes M–3XL",
          "qty": "220",
          "unit": "pcs",
          "price": "3,800.00",
          "amount": "836,000.00",
          "img": "assets/products/shirt.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><circle cx=\"12\" cy=\"12\" r=\"8\" /><path d=\"M12 4v8l4 4\" /></svg>"
        },
        {
          "kind": "item",
          "n": 26,
          "name": "Exterior weatherproof emulsion paint 20 L",
          "make": "Elastomeric, factory grey (RAL 7040)",
          "spec": "Two-coat system; coverage ≈ 10 m²/L per coat",
          "qty": "160",
          "unit": "buckets",
          "price": "46,500.00",
          "amount": "7,440,000.00",
          "img": "assets/products/paint-roller.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M4 12h16v4H4zM8 12V8h8v4\" /></svg>"
        }
      ],
      "totals": [
        [
          "Gross subtotal",
          "270,609,400.00",
          ""
        ],
        [
          "Installation / labour",
          "7,600,960.00",
          ""
        ],
        [
          "Subtotal discount (2.5%)",
          "− 6,765,235.00",
          ""
        ],
        [
          "Net subtotal",
          "271,445,125.00",
          "sum"
        ],
        [
          "VAT (7.5%)",
          "20,358,384.38",
          ""
        ],
        [
          "Transportation &amp; logistics",
          "1,850,000.00",
          ""
        ],
        [
          "Offloading &amp; handling",
          "420,000.00",
          ""
        ],
        [
          "WHT (5.0%) — deducted",
          "− 13,572,256.25",
          ""
        ]
      ],
      "total_label": "Total Amount Due",
      "total": "280,501,253.13",
      "words": "Two Hundred and Eighty Million, Five Hundred and One Thousand, Two Hundred and Fifty-Three Naira and Thirteen Kobo Only",
      "party": {
        "name": "Northgate Foods Processing Nigeria Ltd",
        "addr": "Km 18, Lagos–Ibadan Expressway, Mowe, Ogun State, Nigeria",
        "contact": "Ms. Adaeze Obi — Procurement Lead",
        "phone": "+234 800 555 0177",
        "email": "procurement@northgate-foods.example",
        "tin": "TIN 31827465-0001"
      },
      "project_block": {
        "label": "Project Information",
        "lines": [
          "Northgate Foods Factory — Phase 2 (Production Hall & Utilities)",
          "Site: Km 18, Lagos–Ibadan Expressway, Mowe, Ogun State",
          "Contract No.: NGF/CON/2026/P2-014"
        ]
      },
      "meta": [
        [
          "Issue Date",
          "30/10/2026"
        ],
        [
          "Due Date",
          "29/11/2026"
        ],
        [
          "Payment Terms",
          "Net 30"
        ],
        [
          "Client PO Ref.",
          "NGF-LPO-4471"
        ]
      ],
      "custom": [
        [
          "Project Manager",
          "Eng. C. Okeke"
        ],
        [
          "Delivery Window",
          "4–6 weeks"
        ],
        [
          "Cost Centre",
          "NGF-P2-MEP"
        ]
      ],
      "ancillary": {
        "title": "Bank Payment Details",
        "kind": "bank",
        "accounts": [
          {
            "bank": "First Meridian Bank (illustrative)",
            "name": "Kestrel Industrial Supply Ltd",
            "no": "0123456789",
            "note": "Primary — Naira current account"
          },
          {
            "bank": "Atlas Commerce Bank (illustrative)",
            "name": "Kestrel Industrial Supply Ltd",
            "no": "9876543210",
            "note": "Secondary — Naira collection account"
          }
        ]
      },
      "notes": "<ul><li><b>Scope:</b> materials, equipment and supplies for <b>Phase 2</b> of the Northgate Foods factory (production hall &amp; utilities), awarded under contract <b>NGF/CON/2026/P2-014</b>.</li><li>Items 1–3 and 7–10 were delivered in full on the dates shown on the signed delivery notes; grouped items were delivered per section.</li><li>Installation charges apply only where an installation rate is stated per item. All other items are supply-only.</li><li><i>Tax invoice:</i> VAT is charged at 7.5%. WHT at 5% is deducted at source by the client; a valid WHT credit note must be returned within 30 days.</li></ul>",
      "terms": [
        "<b>Payment:</b> Net 30 days from invoice date. Payment is by electronic transfer to the accounts shown; quote the invoice number as reference.",
        "<b>Late payment:</b> overdue balances attract interest at 1.5% per month on the outstanding amount after the due date.",
        "<b>Retention of title:</b> goods remain the property of the issuer until paid for in full.",
        "<b>Inspection:</b> any shortage, damage or non-conformity must be reported in writing within 7 days of delivery; claims after this period may not be accepted.",
        "<b>Warranty:</b> manufacturer warranties apply as stated per item; workmanship on installed items is warranted for 12 months.",
        "<b>Returns:</b> special-order and cut-to-length items (e.g. cables, conduit) are non-returnable.",
        "<b>Disputes:</b> unresolved disputes are referred to arbitration in Lagos under the Arbitration and Mediation Act.",
        "<b>Governing law:</b> the laws of the Federal Republic of Nigeria."
      ],
      "sigs": {
        "left": "Issuer authorised signatory",
        "right": "Client receiving / confirmation acknowledgement",
        "rlabel": "Received by",
        "lname": "Mr. Chukwuemeka Daniels",
        "ltitle": "Authorised Signatory"
      },
      "runhead": "Invoice · INV-2026-0147",
      "runright": "Northgate Foods Processing Nigeria Ltd"
    },
    "quo": {
      "kind": "quo",
      "title": "QUOTATION",
      "number": "QUOT-2026-0045",
      "pricehead": "Unit Price (₦)",
      "party_label": "Bill To · Client",
      "grouped": true,
      "rows": [
        {
          "kind": "item",
          "n": 1,
          "name": "Portland-limestone cement CEM II 42.5R",
          "make": "Dangote-grade bulk supply (synthetic spec)",
          "spec": "50 kg bags, palletised<br><i>Delivery in 4 tranches</i>",
          "qty": "1,200",
          "unit": "bags",
          "price": "10,400.00",
          "amount": "12,480,000.00",
          "img": "assets/products/brick-wall.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"4\" y=\"6\" width=\"16\" height=\"12\" rx=\"2\" /><path d=\"M8 6v12M16 6v12M4 12h16\" /></svg>"
        },
        {
          "kind": "item",
          "n": 2,
          "name": "High-yield deformed reinforcement bar Y16",
          "make": "BS 4449:2005 Grade B500B",
          "spec": "12 m lengths, mill-certified<br>Bundled &amp; tagged by heat number<br>Delivery tolerance ±2% on tonnage; weighbridge tickets supplied with every load",
          "qty": "85",
          "unit": "tonnes",
          "price": "1,150,000.00",
          "amount": "97,750,000.00",
          "img": "assets/products/construction.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"2\" /><path d=\"M9 9h6v6H9z\" /></svg>"
        },
        {
          "kind": "item",
          "n": 3,
          "name": "Hot-dip galvanised structural I-beam IPE 300",
          "make": "S275JR — EN 10025",
          "spec": "12 m lengths; <b>galvanised to ISO 1461</b><br>Mill test certificates supplied<br><i>Optional:</i> primer plus two-coat polyurethane finish available on request",
          "qty": "42",
          "unit": "pcs",
          "price": "486,500.00",
          "amount": "20,433,000.00",
          "img": null,
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M12 3v18M8 8h8M8 16h8\" /></svg>"
        },
        {
          "kind": "group",
          "title": "Electrical — Power Cables & Distribution",
          "subtotal": "57,108,000.00"
        },
        {
          "kind": "item",
          "n": 4,
          "name": "Armoured power cable 4-core 95 mm² Cu/XLPE/SWA/PVC",
          "make": "0.6/1 kV — BS 5467",
          "spec": "Drum length 250 m; <b>cut-to-length</b> on request<br>Supplied on returnable steel drums",
          "qty": "1,500",
          "unit": "m",
          "price": "28,400.00",
          "amount": "42,600,000.00",
          "img": "assets/products/cable.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"2\" /><path d=\"M4 9h16M9 9v11\" /></svg>"
        },
        {
          "kind": "item",
          "n": 5,
          "name": "Main LV distribution board, 800 A, TPN, 36-way",
          "make": "Form 2b, IP54 floor-standing",
          "spec": "Powder-coated 2 mm sheet steel, 800 A copper busbar<br>Incl. neutral &amp; earth bars; type-tested to IEC 61439<br>Factory-wired with surge protection and metering CT provisions",
          "qty": "6",
          "unit": "pcs",
          "price": "1,850,000.00",
          "amount": "11,100,000.00",
          "img": "assets/products/zap.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"2\" y=\"6\" width=\"20\" height=\"12\" rx=\"2\" /><path d=\"M6 12h2M10 12h2M14 12h2M18 12h2\" /></svg>"
        },
        {
          "kind": "item",
          "n": 6,
          "name": "MCCB 3-pole 250 A, 36 kA",
          "make": "Adjustable thermal-magnetic trip",
          "spec": "Breaking capacity 36 kA @ 415 V; rotary handle, terminal shrouds &amp; auxiliary contact included",
          "qty": "24",
          "unit": "pcs",
          "price": "142,000.00",
          "amount": "3,408,000.00",
          "img": "assets/products/plug-zap.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\" /><path d=\"M7 15h10M12 5v10\" /></svg>"
        },
        {
          "kind": "item",
          "n": 7,
          "name": "Centrifugal end-suction pump set, 7.5 kW",
          "make": "50 m³/h @ 32 m head — cast-iron volute",
          "spec": "<b>Set includes:</b> 3-phase motor, baseplate, coupling guard, flexible couplings<br><i>2-year manufacturer warranty</i>",
          "qty": "4",
          "unit": "sets",
          "price": "1,420,000.00",
          "amount": "5,680,000.00",
          "img": "assets/products/cog.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><circle cx=\"12\" cy=\"12\" r=\"6\" /><path d=\"M12 6v6l4 2\" /></svg>"
        },
        {
          "kind": "item",
          "n": 8,
          "name": "Axial roof ventilation fan 900 mm, 1.1 kW",
          "make": "IP55, 3-phase, backdraught shutter",
          "spec": "Galvanised housing; 18,500 m³/h",
          "qty": "12",
          "unit": "pcs",
          "price": "385,000.00",
          "amount": "4,620,000.00",
          "img": "assets/products/fan.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><circle cx=\"12\" cy=\"12\" r=\"4\" /><path d=\"M12 2v4M12 18v4M2 12h4M18 12h4\" /></svg>"
        },
        {
          "kind": "item",
          "n": 9,
          "name": "Three-phase induction motor 15 kW, IE3, 4-pole, B3",
          "make": "Foot-mounted, 400 V / 50 Hz",
          "spec": "Class F insulation; IP55; with PTC thermistors",
          "qty": "6",
          "unit": "pcs",
          "price": "920,000.00",
          "amount": "5,520,000.00",
          "img": null,
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><circle cx=\"12\" cy=\"12\" r=\"8\" /><circle cx=\"12\" cy=\"12\" r=\"2\" /><path d=\"M12 4v4M12 16v4M4 12h4M16 12h4\" /></svg>"
        },
        {
          "kind": "item",
          "n": 10,
          "name": "V-belt, pulley &amp; coupling accessory kit",
          "make": "Assorted B-section",
          "spec": null,
          "qty": "30",
          "unit": "lots",
          "price": "38,500.00",
          "amount": "1,155,000.00",
          "img": "assets/products/wrench.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"4\" y=\"10\" width=\"16\" height=\"4\" rx=\"1\" /><path d=\"M6 14v4M18 14v4\" /></svg>"
        },
        {
          "kind": "group",
          "title": "Plumbing & Sanitary Materials",
          "subtotal": "9,481,000.00"
        },
        {
          "kind": "item",
          "n": 11,
          "name": "uPVC pressure pipe 110 mm, PN10",
          "make": "6 m socketed lengths — water supply",
          "spec": "Solvent-weld or rubber-ring joint; includes 10% fitting allowance",
          "qty": "320",
          "unit": "lengths",
          "price": "18,600.00",
          "amount": "5,952,000.00",
          "img": "assets/products/droplets.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M4 8h16v8H4z\" /><path d=\"M8 8v8M16 8v8\" /></svg>"
        },
        {
          "kind": "item",
          "n": 12,
          "name": "Cast-iron flanged gate valve DN100, PN16",
          "make": "Resilient-seated, non-rising stem",
          "spec": "Epoxy-coated body; handwheel operated; PN16 drilled flanges",
          "qty": "18",
          "unit": "pcs",
          "price": "96,500.00",
          "amount": "1,737,000.00",
          "img": "assets/products/settings-2.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M12 4v16M8 8h8M8 16h8\" /></svg>"
        },
        {
          "kind": "item",
          "n": 13,
          "name": "Industrial sanitary suite — floor-mounted WC with cistern &amp; wall-hung basin",
          "make": "Vitreous china, white",
          "spec": "Complete with seat, 15 mm angle valves, flexible connectors &amp; waste fittings<br><b>Includes</b> installation pack",
          "qty": "14",
          "unit": "sets",
          "price": "128,000.00",
          "amount": "1,792,000.00",
          "img": "assets/products/toilet.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M6 10h12v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6zM9 10V6h6v4\" /></svg>"
        },
        {
          "kind": "item",
          "n": 14,
          "name": "Safety helmet (hard hat), 6-point ratchet",
          "make": "HDPE shell — EN 397",
          "spec": "Colour-coded by trade: white / yellow / blue",
          "qty": "180",
          "unit": "pcs",
          "price": "4,200.00",
          "amount": "756,000.00",
          "img": "assets/products/hard-hat.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M7 8h10v12H7zM9 8V5h6v3\" /></svg>"
        },
        {
          "kind": "item",
          "n": 15,
          "name": "Safety boots, steel toe-cap &amp; midsole, S3",
          "make": "Oil-resistant PU outsole — sizes 39–46",
          "spec": "Supplied in a size run agreed with site HSE",
          "qty": "180",
          "unit": "pairs",
          "price": "31,500.00",
          "amount": "5,670,000.00",
          "img": "assets/products/footprints.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M4 18L20 6M4 12L20 0M8 22L24 10\" /></svg>"
        },
        {
          "kind": "group",
          "title": "Computers & IT Equipment",
          "subtotal": "22,260,000.00"
        },
        {
          "kind": "item",
          "n": 16,
          "name": "Desktop workstation, Core i7 / 16 GB / 512 GB NVMe, with 24″ monitor",
          "make": "Business-class tower, Windows 11 Pro",
          "spec": "<b>Specification:</b> 12th-gen Core i7, 16 GB DDR4, 512 GB NVMe SSD, 24″ FHD IPS monitor, keyboard &amp; mouse<br>3-year on-site warranty<br><b>Included:</b> Windows 11 Pro licence, wired keyboard &amp; optical mouse, power cable<br>Pre-imaged with the client’s standard software build; asset-tagged on delivery<br>Rated for 24/7 operation up to 35 °C ambient",
          "qty": "20",
          "unit": "units",
          "price": "865,000.00",
          "amount": "17,300,000.00",
          "img": "assets/products/monitor.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M12 3a9 9 0 0 0-9 9h18a9 9 0 0 0-9-9zM12 3v9\" /></svg>"
        },
        {
          "kind": "item",
          "n": 17,
          "name": "Managed 48-port Gigabit PoE+ switch with 4 × 10G SFP+ uplinks",
          "make": "Layer 3 lite; rack-mount 1U",
          "spec": "740 W PoE budget; includes rack ears &amp; console cable<br>Dual hot-swap PSU bays (one fitted); front-to-back airflow<br>Supports 802.1X, LACP, IGMP snooping, VLAN and QoS<br>Includes 4 × SFP+ direct-attach cables, 1 m",
          "qty": "4",
          "unit": "pcs",
          "price": "1,240,000.00",
          "amount": "4,960,000.00",
          "img": "assets/products/router.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M6 18v-4h12v4M8 14V8h8v6\" /></svg>"
        },
        {
          "kind": "group",
          "title": "Electrical — Power Systems & Lighting",
          "subtotal": "17,660,400.00"
        },
        {
          "kind": "item",
          "n": 18,
          "name": "Online double-conversion UPS 10 kVA, 3-phase in / 1-phase out",
          "make": "Rack/tower convertible, with 15-min battery bank",
          "spec": "True online topology; <b>N+1 parallel-ready</b>; SNMP card included<br>Battery: 20 × 12 V 9 Ah sealed lead-acid",
          "qty": "3",
          "unit": "units",
          "price": "2,350,000.00",
          "amount": "7,050,000.00",
          "img": "assets/products/battery-charging.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"3\" y=\"8\" width=\"18\" height=\"10\" rx=\"2\" /><path d=\"M7 8V6h10v2\" /></svg>"
        },
        {
          "kind": "item",
          "n": 19,
          "name": "LED high-bay light 150 W, IP65",
          "make": "5000 K, 120 lm/W, 90° optic",
          "spec": "Aluminium heat-sink body; 5-year warranty",
          "qty": "120",
          "unit": "pcs",
          "price": "38,500.00",
          "amount": "4,620,000.00",
          "img": "assets/products/lightbulb.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"2\" y=\"6\" width=\"20\" height=\"12\" rx=\"1\" /><path d=\"M6 6v12M10 6v12M14 6v12M18 6v12\" /></svg>"
        },
        {
          "kind": "item",
          "n": 20,
          "name": "LED recessed panel 600 × 600 mm, 40 W",
          "make": "4000 K, UGR&lt;19",
          "spec": null,
          "qty": "200",
          "unit": "pcs",
          "price": "16,800.00",
          "amount": "3,360,000.00",
          "img": "assets/products/lamp.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"6\" y=\"4\" width=\"12\" height=\"16\" rx=\"4\" /><path d=\"M9 4v16\" /></svg>"
        },
        {
          "kind": "item",
          "n": 21,
          "name": "LED emergency exit sign, 3-hour battery backup",
          "make": "Maintained / non-maintained selectable",
          "spec": null,
          "qty": "36",
          "unit": "pcs",
          "price": "14,900.00",
          "amount": "536,400.00",
          "img": null,
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><circle cx=\"12\" cy=\"12\" r=\"4\" /><path d=\"M12 2v4M12 18v4M2 12h4M18 12h4\" /></svg>"
        },
        {
          "kind": "item",
          "n": 22,
          "name": "Heavy-gauge PVC conduit 25 mm with standard junction boxes, saddles, bends and couplers (assorted)",
          "make": "BS EN 61386 — 3 m lengths",
          "spec": "Lengths priced individually; accessories supplied at the ratio 1 : 1",
          "qty": "800",
          "unit": "lengths",
          "price": "1,350.00",
          "amount": "1,080,000.00",
          "img": null,
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"2\" /><path d=\"M8 8h8v8H8z\" /></svg>"
        },
        {
          "kind": "item",
          "n": 23,
          "name": "13 A twin switched socket outlet, flush-mount, IP20",
          "make": "White, with 2 × USB-A charging ports",
          "spec": null,
          "qty": "260",
          "unit": "pcs",
          "price": "3,900.00",
          "amount": "1,014,000.00",
          "img": "assets/products/plug-zap.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><circle cx=\"12\" cy=\"12\" r=\"5\" /><path d=\"M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41\" /></svg>"
        },
        {
          "kind": "group",
          "title": "Safety Equipment & PPE",
          "subtotal": "2,596,000.00"
        },
        {
          "kind": "item",
          "n": 24,
          "name": "Fire extinguisher 9 kg ABC dry-powder, with wall bracket",
          "make": "Rated 55A/233B — EN 3-7",
          "spec": "Annual service tag included<br><b>Includes</b> 1 × signage plate per unit",
          "qty": "40",
          "unit": "pcs",
          "price": "44,000.00",
          "amount": "1,760,000.00",
          "img": "assets/products/fire-extinguisher.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"1\" /><path d=\"M8 4v16M12 4v16M16 4v16\" /></svg>"
        },
        {
          "kind": "item",
          "n": 25,
          "name": "High-visibility reflective vest, class 2",
          "make": "EN ISO 20471 — 120 gsm",
          "spec": "Zip front, 2 pockets; sizes M–3XL",
          "qty": "220",
          "unit": "pcs",
          "price": "3,800.00",
          "amount": "836,000.00",
          "img": "assets/products/shirt.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><circle cx=\"12\" cy=\"12\" r=\"8\" /><path d=\"M12 4v8l4 4\" /></svg>"
        },
        {
          "kind": "item",
          "n": 26,
          "name": "Exterior weatherproof emulsion paint 20 L",
          "make": "Elastomeric, factory grey (RAL 7040)",
          "spec": "Two-coat system; coverage ≈ 10 m²/L per coat",
          "qty": "160",
          "unit": "buckets",
          "price": "46,500.00",
          "amount": "7,440,000.00",
          "img": "assets/products/paint-roller.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M4 12h16v4H4zM8 12V8h8v4\" /></svg>"
        }
      ],
      "totals": [
        [
          "Gross subtotal",
          "270,609,400.00",
          ""
        ],
        [
          "Installation / labour",
          "7,600,960.00",
          ""
        ],
        [
          "Subtotal discount (2.5%)",
          "− 6,765,235.00",
          ""
        ],
        [
          "Net subtotal",
          "271,445,125.00",
          "sum"
        ],
        [
          "VAT (7.5%)",
          "20,358,384.38",
          ""
        ],
        [
          "Transportation &amp; logistics",
          "1,850,000.00",
          ""
        ],
        [
          "Offloading &amp; handling",
          "420,000.00",
          ""
        ],
        [
          "WHT (5.0%) — estimated",
          "− 13,572,256.25",
          ""
        ]
      ],
      "total_label": "Total Quoted Amount",
      "total": "280,501,253.13",
      "words": "Two Hundred and Eighty Million, Five Hundred and One Thousand, Two Hundred and Fifty-Three Naira and Thirteen Kobo Only",
      "party": {
        "name": "Northgate Foods Processing Nigeria Ltd",
        "addr": "Km 18, Lagos–Ibadan Expressway, Mowe, Ogun State, Nigeria",
        "contact": "Ms. Adaeze Obi — Procurement Lead",
        "phone": "+234 800 555 0177",
        "email": "procurement@northgate-foods.example",
        "tin": "TIN 31827465-0001"
      },
      "project_block": {
        "label": "Project Information",
        "lines": [
          "Northgate Foods Factory — Phase 2 (Production Hall & Utilities)",
          "Site: Km 18, Lagos–Ibadan Expressway, Mowe, Ogun State",
          "Contract No.: NGF/CON/2026/P2-014"
        ]
      },
      "meta": [
        [
          "Quotation Date",
          "30/10/2026"
        ],
        [
          "Valid Until",
          "13/11/2026"
        ],
        [
          "Payment Terms",
          "70% advance / 30% on completion"
        ],
        [
          "Client RFQ Ref.",
          "NGF-RFQ-2026-118"
        ]
      ],
      "custom": [
        [
          "Project Manager",
          "Eng. C. Okeke"
        ],
        [
          "Delivery Window",
          "4–6 weeks"
        ],
        [
          "Cost Centre",
          "NGF-P2-MEP"
        ]
      ],
      "ancillary": {
        "title": "Payment Details (Advance Deposit)",
        "kind": "bank",
        "accounts": [
          {
            "bank": "First Meridian Bank (illustrative)",
            "name": "Kestrel Industrial Supply Ltd",
            "no": "0123456789",
            "note": "Advance payment deposit — 70% of total on acceptance"
          }
        ]
      },
      "notes": "<ul><li><b>Scope of supply:</b> materials, equipment and supplies for <b>Phase 2</b> of the Northgate Foods factory (production hall &amp; utilities) under contract <b>NGF/CON/2026/P2-014</b>.</li><li>Quantities are based on the bill of quantities issued 12/10/2026 (rev. B); variations will be re-priced at the rates shown.</li><li><b>Exclusions:</b> civil works for plant plinths, permits, third-party testing and any works not itemised above.</li><li>Installation is quoted at the item rates indicated; commissioning is available as a separate line on request.</li></ul>",
      "terms": [
        "<b>Validity:</b> this quotation is valid for 14 days from the quotation date. Prices are subject to review thereafter due to exchange-rate and commodity movements.",
        "<b>Payment schedule:</b> 70% advance on order confirmation, 30% on completion of delivery; installation as agreed per milestone.",
        "<b>Delivery:</b> 4–6 weeks from receipt of advance payment, subject to stock at time of order.",
        "<b>Acceptance:</b> the quotation becomes binding only when signed and returned with the advance payment or a valid purchase order.",
        "<b>Variations:</b> changes to scope or quantities after acceptance will be priced separately and agreed in writing.",
        "<b>Taxes:</b> VAT at 7.5%; WHT is shown as an estimate and will be settled at invoicing.",
        "<b>Warranty:</b> as per manufacturer terms; workmanship warranted for 12 months.",
        "<b>Governing law:</b> the laws of the Federal Republic of Nigeria."
      ],
      "sigs": {
        "left": "Prepared by / sales representative",
        "right": "Accepted &amp; approved by client",
        "rlabel": "Accepted by",
        "lname": "Mr. Chukwuemeka Daniels",
        "ltitle": "Sales Representative"
      },
      "runhead": "Quotation · QUOT-2026-0045",
      "runright": "Northgate Foods Processing Nigeria Ltd"
    },
    "po": {
      "kind": "po",
      "title": "PURCHASE ORDER",
      "number": "PO-2026-0089",
      "pricehead": "Unit Cost (₦)",
      "party_label": "Order From · Supplier / Vendor",
      "grouped": false,
      "rows": [
        {
          "kind": "item",
          "n": 1,
          "name": "Portland-limestone cement CEM II 42.5R",
          "make": "Dangote-grade bulk supply (synthetic spec)",
          "spec": "50 kg bags, palletised<br><i>Delivery in 4 tranches</i>",
          "qty": "1,200",
          "unit": "bags",
          "price": "8,550.00",
          "amount": "10,260,000.00",
          "img": "assets/products/brick-wall.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"4\" y=\"6\" width=\"16\" height=\"12\" rx=\"2\" /><path d=\"M8 6v12M16 6v12M4 12h16\" /></svg>"
        },
        {
          "kind": "item",
          "n": 2,
          "name": "High-yield deformed reinforcement bar Y16",
          "make": "BS 4449:2005 Grade B500B",
          "spec": "12 m lengths, mill-certified<br>Bundled &amp; tagged by heat number<br>Delivery tolerance ±2% on tonnage; weighbridge tickets supplied with every load",
          "qty": "85",
          "unit": "tonnes",
          "price": "943,000.00",
          "amount": "80,155,000.00",
          "img": "assets/products/construction.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"2\" /><path d=\"M9 9h6v6H9z\" /></svg>"
        },
        {
          "kind": "item",
          "n": 3,
          "name": "Hot-dip galvanised structural I-beam IPE 300",
          "make": "S275JR — EN 10025",
          "spec": "12 m lengths; <b>galvanised to ISO 1461</b><br>Mill test certificates supplied<br><i>Optional:</i> primer plus two-coat polyurethane finish available on request",
          "qty": "42",
          "unit": "pcs",
          "price": "398,950.00",
          "amount": "16,755,900.00",
          "img": null,
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M12 3v18M8 8h8M8 16h8\" /></svg>"
        },
        {
          "kind": "item",
          "n": 4,
          "name": "Armoured power cable 4-core 95 mm² Cu/XLPE/SWA/PVC",
          "make": "0.6/1 kV — BS 5467",
          "spec": "Drum length 250 m; <b>cut-to-length</b> on request<br>Supplied on returnable steel drums",
          "qty": "1,500",
          "unit": "m",
          "price": "23,300.00",
          "amount": "34,950,000.00",
          "img": "assets/products/cable.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"2\" /><path d=\"M4 9h16M9 9v11\" /></svg>"
        },
        {
          "kind": "item",
          "n": 5,
          "name": "Main LV distribution board, 800 A, TPN, 36-way",
          "make": "Form 2b, IP54 floor-standing",
          "spec": "Powder-coated 2 mm sheet steel, 800 A copper busbar<br>Incl. neutral &amp; earth bars; type-tested to IEC 61439<br>Factory-wired with surge protection and metering CT provisions",
          "qty": "6",
          "unit": "pcs",
          "price": "1,517,000.00",
          "amount": "9,102,000.00",
          "img": "assets/products/zap.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"2\" y=\"6\" width=\"20\" height=\"12\" rx=\"2\" /><path d=\"M6 12h2M10 12h2M14 12h2M18 12h2\" /></svg>"
        },
        {
          "kind": "item",
          "n": 6,
          "name": "MCCB 3-pole 250 A, 36 kA",
          "make": "Adjustable thermal-magnetic trip",
          "spec": "Breaking capacity 36 kA @ 415 V; rotary handle, terminal shrouds &amp; auxiliary contact included",
          "qty": "24",
          "unit": "pcs",
          "price": "116,450.00",
          "amount": "2,794,800.00",
          "img": "assets/products/plug-zap.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\" /><path d=\"M7 15h10M12 5v10\" /></svg>"
        },
        {
          "kind": "item",
          "n": 7,
          "name": "Centrifugal end-suction pump set, 7.5 kW",
          "make": "50 m³/h @ 32 m head — cast-iron volute",
          "spec": "<b>Set includes:</b> 3-phase motor, baseplate, coupling guard, flexible couplings<br><i>2-year manufacturer warranty</i>",
          "qty": "4",
          "unit": "sets",
          "price": "1,164,400.00",
          "amount": "4,657,600.00",
          "img": "assets/products/cog.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><circle cx=\"12\" cy=\"12\" r=\"6\" /><path d=\"M12 6v6l4 2\" /></svg>"
        },
        {
          "kind": "item",
          "n": 8,
          "name": "Axial roof ventilation fan 900 mm, 1.1 kW",
          "make": "IP55, 3-phase, backdraught shutter",
          "spec": "Galvanised housing; 18,500 m³/h",
          "qty": "12",
          "unit": "pcs",
          "price": "315,700.00",
          "amount": "3,788,400.00",
          "img": "assets/products/fan.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><circle cx=\"12\" cy=\"12\" r=\"4\" /><path d=\"M12 2v4M12 18v4M2 12h4M18 12h4\" /></svg>"
        },
        {
          "kind": "item",
          "n": 9,
          "name": "Three-phase induction motor 15 kW, IE3, 4-pole, B3",
          "make": "Foot-mounted, 400 V / 50 Hz",
          "spec": "Class F insulation; IP55; with PTC thermistors",
          "qty": "6",
          "unit": "pcs",
          "price": "754,400.00",
          "amount": "4,526,400.00",
          "img": null,
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><circle cx=\"12\" cy=\"12\" r=\"8\" /><circle cx=\"12\" cy=\"12\" r=\"2\" /><path d=\"M12 4v4M12 16v4M4 12h4M16 12h4\" /></svg>"
        },
        {
          "kind": "item",
          "n": 10,
          "name": "V-belt, pulley &amp; coupling accessory kit",
          "make": "Assorted B-section",
          "spec": null,
          "qty": "30",
          "unit": "lots",
          "price": "31,550.00",
          "amount": "946,500.00",
          "img": "assets/products/wrench.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"4\" y=\"10\" width=\"16\" height=\"4\" rx=\"1\" /><path d=\"M6 14v4M18 14v4\" /></svg>"
        },
        {
          "kind": "item",
          "n": 11,
          "name": "uPVC pressure pipe 110 mm, PN10",
          "make": "6 m socketed lengths — water supply",
          "spec": "Solvent-weld or rubber-ring joint; includes 10% fitting allowance",
          "qty": "320",
          "unit": "lengths",
          "price": "15,250.00",
          "amount": "4,880,000.00",
          "img": "assets/products/droplets.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M4 8h16v8H4z\" /><path d=\"M8 8v8M16 8v8\" /></svg>"
        },
        {
          "kind": "item",
          "n": 12,
          "name": "Cast-iron flanged gate valve DN100, PN16",
          "make": "Resilient-seated, non-rising stem",
          "spec": "Epoxy-coated body; handwheel operated; PN16 drilled flanges",
          "qty": "18",
          "unit": "pcs",
          "price": "79,150.00",
          "amount": "1,424,700.00",
          "img": "assets/products/settings-2.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M12 4v16M8 8h8M8 16h8\" /></svg>"
        },
        {
          "kind": "item",
          "n": 13,
          "name": "Industrial sanitary suite — floor-mounted WC with cistern &amp; wall-hung basin",
          "make": "Vitreous china, white",
          "spec": "Complete with seat, 15 mm angle valves, flexible connectors &amp; waste fittings<br><b>Includes</b> installation pack",
          "qty": "14",
          "unit": "sets",
          "price": "104,950.00",
          "amount": "1,469,300.00",
          "img": "assets/products/toilet.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M6 10h12v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6zM9 10V6h6v4\" /></svg>"
        },
        {
          "kind": "item",
          "n": 14,
          "name": "Safety helmet (hard hat), 6-point ratchet",
          "make": "HDPE shell — EN 397",
          "spec": "Colour-coded by trade: white / yellow / blue",
          "qty": "180",
          "unit": "pcs",
          "price": "3,450.00",
          "amount": "621,000.00",
          "img": "assets/products/hard-hat.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M7 8h10v12H7zM9 8V5h6v3\" /></svg>"
        },
        {
          "kind": "item",
          "n": 15,
          "name": "Safety boots, steel toe-cap &amp; midsole, S3",
          "make": "Oil-resistant PU outsole — sizes 39–46",
          "spec": "Supplied in a size run agreed with site HSE",
          "qty": "180",
          "unit": "pairs",
          "price": "25,850.00",
          "amount": "4,653,000.00",
          "img": "assets/products/footprints.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M4 18L20 6M4 12L20 0M8 22L24 10\" /></svg>"
        },
        {
          "kind": "item",
          "n": 16,
          "name": "Desktop workstation, Core i7 / 16 GB / 512 GB NVMe, with 24″ monitor",
          "make": "Business-class tower, Windows 11 Pro",
          "spec": "<b>Specification:</b> 12th-gen Core i7, 16 GB DDR4, 512 GB NVMe SSD, 24″ FHD IPS monitor, keyboard &amp; mouse<br>3-year on-site warranty<br><b>Included:</b> Windows 11 Pro licence, wired keyboard &amp; optical mouse, power cable<br>Pre-imaged with the client’s standard software build; asset-tagged on delivery<br>Rated for 24/7 operation up to 35 °C ambient",
          "qty": "20",
          "unit": "units",
          "price": "709,300.00",
          "amount": "14,186,000.00",
          "img": "assets/products/monitor.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M12 3a9 9 0 0 0-9 9h18a9 9 0 0 0-9-9zM12 3v9\" /></svg>"
        },
        {
          "kind": "item",
          "n": 17,
          "name": "Managed 48-port Gigabit PoE+ switch with 4 × 10G SFP+ uplinks",
          "make": "Layer 3 lite; rack-mount 1U",
          "spec": "740 W PoE budget; includes rack ears &amp; console cable<br>Dual hot-swap PSU bays (one fitted); front-to-back airflow<br>Supports 802.1X, LACP, IGMP snooping, VLAN and QoS<br>Includes 4 × SFP+ direct-attach cables, 1 m",
          "qty": "4",
          "unit": "pcs",
          "price": "1,016,800.00",
          "amount": "4,067,200.00",
          "img": "assets/products/router.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M6 18v-4h12v4M8 14V8h8v6\" /></svg>"
        },
        {
          "kind": "item",
          "n": 18,
          "name": "Online double-conversion UPS 10 kVA, 3-phase in / 1-phase out",
          "make": "Rack/tower convertible, with 15-min battery bank",
          "spec": "True online topology; <b>N+1 parallel-ready</b>; SNMP card included<br>Battery: 20 × 12 V 9 Ah sealed lead-acid",
          "qty": "3",
          "unit": "units",
          "price": "1,927,000.00",
          "amount": "5,781,000.00",
          "img": "assets/products/battery-charging.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"3\" y=\"8\" width=\"18\" height=\"10\" rx=\"2\" /><path d=\"M7 8V6h10v2\" /></svg>"
        },
        {
          "kind": "item",
          "n": 19,
          "name": "LED high-bay light 150 W, IP65",
          "make": "5000 K, 120 lm/W, 90° optic",
          "spec": "Aluminium heat-sink body; 5-year warranty",
          "qty": "120",
          "unit": "pcs",
          "price": "31,550.00",
          "amount": "3,786,000.00",
          "img": "assets/products/lightbulb.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"2\" y=\"6\" width=\"20\" height=\"12\" rx=\"1\" /><path d=\"M6 6v12M10 6v12M14 6v12M18 6v12\" /></svg>"
        },
        {
          "kind": "item",
          "n": 20,
          "name": "LED recessed panel 600 × 600 mm, 40 W",
          "make": "4000 K, UGR&lt;19",
          "spec": null,
          "qty": "200",
          "unit": "pcs",
          "price": "13,800.00",
          "amount": "2,760,000.00",
          "img": "assets/products/lamp.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"6\" y=\"4\" width=\"12\" height=\"16\" rx=\"4\" /><path d=\"M9 4v16\" /></svg>"
        },
        {
          "kind": "item",
          "n": 21,
          "name": "LED emergency exit sign, 3-hour battery backup",
          "make": "Maintained / non-maintained selectable",
          "spec": null,
          "qty": "36",
          "unit": "pcs",
          "price": "12,200.00",
          "amount": "439,200.00",
          "img": null,
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><circle cx=\"12\" cy=\"12\" r=\"4\" /><path d=\"M12 2v4M12 18v4M2 12h4M18 12h4\" /></svg>"
        },
        {
          "kind": "item",
          "n": 22,
          "name": "Heavy-gauge PVC conduit 25 mm with standard junction boxes, saddles, bends and couplers (assorted)",
          "make": "BS EN 61386 — 3 m lengths",
          "spec": "Lengths priced individually; accessories supplied at the ratio 1 : 1",
          "qty": "800",
          "unit": "lengths",
          "price": "1,100.00",
          "amount": "880,000.00",
          "img": null,
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"2\" /><path d=\"M8 8h8v8H8z\" /></svg>"
        },
        {
          "kind": "item",
          "n": 23,
          "name": "13 A twin switched socket outlet, flush-mount, IP20",
          "make": "White, with 2 × USB-A charging ports",
          "spec": null,
          "qty": "260",
          "unit": "pcs",
          "price": "3,200.00",
          "amount": "832,000.00",
          "img": "assets/products/plug-zap.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><circle cx=\"12\" cy=\"12\" r=\"5\" /><path d=\"M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41\" /></svg>"
        },
        {
          "kind": "item",
          "n": 24,
          "name": "Fire extinguisher 9 kg ABC dry-powder, with wall bracket",
          "make": "Rated 55A/233B — EN 3-7",
          "spec": "Annual service tag included<br><b>Includes</b> 1 × signage plate per unit",
          "qty": "40",
          "unit": "pcs",
          "price": "36,100.00",
          "amount": "1,444,000.00",
          "img": "assets/products/fire-extinguisher.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"1\" /><path d=\"M8 4v16M12 4v16M16 4v16\" /></svg>"
        },
        {
          "kind": "item",
          "n": 25,
          "name": "High-visibility reflective vest, class 2",
          "make": "EN ISO 20471 — 120 gsm",
          "spec": "Zip front, 2 pockets; sizes M–3XL",
          "qty": "220",
          "unit": "pcs",
          "price": "3,100.00",
          "amount": "682,000.00",
          "img": "assets/products/shirt.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><circle cx=\"12\" cy=\"12\" r=\"8\" /><path d=\"M12 4v8l4 4\" /></svg>"
        },
        {
          "kind": "item",
          "n": 26,
          "name": "Exterior weatherproof emulsion paint 20 L",
          "make": "Elastomeric, factory grey (RAL 7040)",
          "spec": "Two-coat system; coverage ≈ 10 m²/L per coat",
          "qty": "160",
          "unit": "buckets",
          "price": "38,150.00",
          "amount": "6,104,000.00",
          "img": "assets/products/paint-roller.svg",
          "svg": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--primary)\" stroke-width=\"1.5\"><path d=\"M4 12h16v4H4zM8 12V8h8v4\" /></svg>"
        }
      ],
      "totals": [
        [
          "Procurement subtotal",
          "221,946,000.00",
          ""
        ],
        [
          "PO discount (3.0%)",
          "− 6,658,380.00",
          ""
        ],
        [
          "Net subtotal",
          "215,287,620.00",
          "sum"
        ],
        [
          "VAT (7.5%)",
          "16,146,571.50",
          ""
        ],
        [
          "Inbound freight to site",
          "650,000.00",
          ""
        ],
        [
          "Loading &amp; insurance in transit",
          "185,000.00",
          ""
        ]
      ],
      "total_label": "Total Order Amount",
      "total": "232,269,191.50",
      "words": "Two Hundred and Thirty-Two Million, Two Hundred and Sixty-Nine Thousand, One Hundred and Ninety-One Naira and Fifty Kobo Only",
      "party": {
        "name": "Meridian Industrial Wholesale Ltd",
        "addr": "Warehouse 4, Ikeja Industrial Estate, Ikeja, Lagos State, Nigeria",
        "contact": "Mr. Tunde Bakare — Sales Manager",
        "phone": "+234 800 555 0199",
        "email": "orders@meridian-wholesale.example",
        "tin": "TIN 24491830-0001"
      },
      "project_block": {
        "label": "Deliver To · Site",
        "lines": [
          "Northgate Foods Factory — Phase 2 (Production Hall & Utilities)",
          "Km 18, Lagos–Ibadan Expressway, Mowe, Ogun State",
          "Site contact: Mr. Ifeanyi Eze — +234 800 555 0120"
        ]
      },
      "meta": [
        [
          "PO Date",
          "30/10/2026"
        ],
        [
          "Required by",
          "20/11/2026"
        ],
        [
          "Project",
          "Northgate Factory Ph. 2"
        ],
        [
          "Contract No.",
          "NGF/CON/2026/P2-014"
        ]
      ],
      "custom": [],
      "ancillary": {
        "title": "Delivery Instructions & Supplier Payment Terms",
        "kind": "text",
        "lines": [
          "<b>Deliver to:</b> Northgate Foods Factory, Km 18 Lagos–Ibadan Expressway, Mowe, Ogun State — Gate 2 (heavy goods).",
          "<b>Delivery window:</b> Mon–Fri 08:00–16:00; 24-hour prior notice to the site store.",
          "<b>Payment:</b> within 30 days upon receipt of delivery and verified invoice."
        ]
      },
      "notes": "<ul><li><b>Procurement for:</b> Northgate Foods factory — Phase 2 (contract <b>NGF/CON/2026/P2-014</b>), as per approved material schedule.</li><li><b>Prices are unit costs</b> agreed under the supplier’s quotation ref. MIW/Q/2026/883 dated 22/10/2026.</li><li>Partial deliveries are acceptable only with prior written approval; each delivery must carry a delivery note quoting this PO number.</li><li><b>Documentation:</b> mill test certificates (items 2–3), type-test reports (items 5–6) and warranty cards (items 7–9, 16–18) must accompany the goods.</li></ul>",
      "terms": [
        "<b>Supplier payment terms:</b> payment within 30 days upon receipt of delivery and a verified tax invoice quoting this PO number.",
        "<b>Delivery:</b> by 20/11/2026 to the site address shown; early or late delivery requires 48-hour prior notice.",
        "<b>Quality &amp; inspection:</b> goods are subject to inspection on arrival. Non-conforming goods will be rejected at the supplier’s cost and replaced within 7 days.",
        "<b>Penalties:</b> late delivery attracts 0.5% of the line value per day, capped at 10% of the order value.",
        "<b>Packing &amp; marking:</b> goods must be packed to withstand road transit and marked with PO number, item number and weight.",
        "<b>Warranty:</b> manufacturer warranty plus a 12-month supplier warranty against defects in materials and workmanship.",
        "<b>Changes:</b> amendments to this order are valid only if issued in writing by the purchasing officer.",
        "<b>Confidentiality:</b> pricing and project details are confidential to the parties."
      ],
      "sigs": {
        "left": "Purchasing officer / requisitioner",
        "right": "Management / finance authorisation",
        "rlabel": "Authorised by",
        "lname": "Mr. Chukwuemeka Daniels",
        "ltitle": "Purchasing Officer"
      },
      "runhead": "Purchase Order · PO-2026-0089",
      "runright": "Meridian Industrial Wholesale Ltd"
    }
  },
  "supplier": {
    "name": "Meridian Industrial Wholesale Ltd",
    "addr": "KM 14, Lagos-Ibadan Expressway, Industrial Corridor, Ogun State",
    "contact": "Chief Sales Directorate — Engr. T. Olatunji",
    "phone": "+234 802 444 8811",
    "email": "sales@meridian-wholesale.example",
    "tin": "TIN 29019284-0001",
    "rc": "RC 1492044"
  }
};
if (typeof window !== "undefined") { window.COMMERCIAL_DATA = COMMERCIAL_DATA; }
