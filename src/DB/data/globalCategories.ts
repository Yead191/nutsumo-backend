/**
 * Job-board categories. ARRAY ORDER = DISPLAY ORDER: the first entry is shown
 * first, the last entry is shown last. Move an entry up to show it earlier.
 *
 * The platform's existing categories come first, then the worldwide categories
 * ordered by global demand.
 *
 * Format: [name, description, starter services]
 * (Existing categories use [] for services — their services are managed elsewhere.)
 */
export type GlobalCategoryEntry = [string, string, string[]];

export const globalCategories: GlobalCategoryEntry[] = [
  // ── Existing platform categories (shown first) ──────────────────
  ['Software Engineering', 'Software design, development, and engineering.', ['Custom Software Development', 'API Development & Integration', 'System Architecture & Design', 'Bug Fixing & Maintenance', 'Code Review & Refactoring', 'Desktop Application Development', 'SaaS Product Development', 'Software Maintenance & Support']],
  ['House Cleaning', 'Standard, deep, and move-out home cleaning.', []],
  ['Landscaping', 'Lawn, garden, tree, and outdoor work.', []],
  ['Masonry & Tile', 'Brick, stone, grout, and tile installation & repair.', []],
  ['Roofing', 'Repair, replacement, inspection, and gutters.', []],
  ['Appliance Repair', 'Repair and maintenance for major home appliances.', []],
  ['Carpentry & Woodwork', 'Cabinetry, framing, furniture, and woodwork repairs.', []],
  ['Handyman', 'General repairs and small household projects.', []],
  ['Painting', 'Interior and exterior painting and finish work.', []],
  ['HVAC', 'Heating, cooling, and ventilation systems.', []],
  ['Electrical', 'Wiring, outlets, panel upgrades, and lighting.', []],
  ['Plumbing', 'Leaks, fixtures, drains, and pipe work.', []],

  // ── Technology ──────────────────────────────────────────────────
  ['Web Development', 'Websites, web apps, and CMS development.', ['Frontend Development', 'Backend Development', 'Full-Stack Development', 'WordPress Development', 'Landing Page Development']],
  ['Mobile App Development', 'iOS, Android, and cross-platform apps.', ['iOS App Development', 'Android App Development', 'React Native Development', 'Flutter Development']],
  ['UI & UX Design', 'User interface and user experience design.', ['Website UI Design', 'Mobile App UI Design', 'UX Research', 'Wireframing & Prototyping']],
  ['IT Support & Networking', 'Tech support, network setup, and maintenance.', ['IT Help Desk Support', 'Network Installation', 'Wi-Fi Setup', 'Server Maintenance']],
  ['Computer & Laptop Repair', 'Hardware and software repair for computers.', ['Laptop Screen Replacement', 'Virus Removal', 'Data Recovery', 'PC Building & Upgrades']],
  ['Phone & Tablet Repair', 'Screen, battery, and hardware repair for devices.', ['Phone Screen Replacement', 'Battery Replacement', 'Water Damage Repair', 'Charging Port Repair']],
  ['Data Science & Analytics', 'Data analysis, dashboards, and insights.', ['Data Analysis', 'Dashboard & BI Reporting', 'Data Visualization', 'Statistical Modeling']],
  ['AI & Machine Learning', 'AI solutions, ML models, and automation.', ['Machine Learning Models', 'Chatbot Development', 'AI Integration', 'Computer Vision']],
  ['DevOps & Cloud Engineering', 'Cloud infrastructure, CI/CD, and deployment.', ['AWS Setup & Management', 'CI/CD Pipeline Setup', 'Docker & Kubernetes', 'Server Migration']],
  ['Cybersecurity', 'Security audits, testing, and protection.', ['Security Audit', 'Penetration Testing', 'Malware Removal', 'Compliance Consulting']],
  ['E-commerce Development', 'Online stores and e-commerce platforms.', ['Shopify Store Setup', 'WooCommerce Development', 'Payment Gateway Integration', 'Product Listing Management']],
  ['Quality Assurance & Testing', 'Manual and automated software testing.', ['Manual Testing', 'Automation Testing', 'Performance Testing', 'Mobile App Testing']],
  ['Database Administration', 'Database design, tuning, and maintenance.', ['Database Design', 'Database Optimization', 'Database Migration', 'Backup & Recovery']],
  ['Game Development', 'Game design and development for all platforms.', ['Unity Game Development', 'Unreal Engine Development', 'Mobile Game Development', 'Game Art & Assets']],
  ['Blockchain Development', 'Smart contracts, dApps, and Web3 solutions.', ['Smart Contract Development', 'dApp Development', 'NFT Development', 'Crypto Wallet Integration']],

  // ── Creative & media ────────────────────────────────────────────
  ['Graphic Design', 'Logos, branding, and visual design.', ['Logo Design', 'Brand Identity Design', 'Social Media Graphics', 'Flyer & Brochure Design', 'Packaging Design']],
  ['Photography', 'Professional photography for every occasion.', ['Event Photography', 'Product Photography', 'Portrait Photography', 'Real Estate Photography']],
  ['Videography & Video Editing', 'Video production, shooting, and editing.', ['Event Videography', 'Video Editing', 'Promotional Videos', 'YouTube Video Editing']],
  ['Animation & Motion Graphics', '2D/3D animation and motion design.', ['2D Animation', '3D Animation', 'Explainer Videos', 'Logo Animation']],
  ['Illustration', 'Custom illustrations and artwork.', ['Book Illustration', "Children's Book Illustration", 'Digital Art', 'Character Design']],
  ['3D Modeling & Rendering', '3D models, renders, and product visualization.', ['Product 3D Modeling', 'Interior 3D Rendering', '3D Printing Models', 'Character Modeling']],
  ['Music & Audio Production', 'Music production, mixing, and audio editing.', ['Mixing & Mastering', 'Beat Production', 'Podcast Editing', 'Jingle Creation']],
  ['Voice Over', 'Professional voice recording for any project.', ['Commercial Voice Over', 'Audiobook Narration', 'E-learning Voice Over', 'IVR & Phone Messages']],
  ['Printing & Signage', 'Printing services and business signage.', ['Business Card Printing', 'Banner Printing', 'Shop Signage', 'Vehicle Wraps']],

  // ── Home & property ─────────────────────────────────────────────
  ['Moving & Relocation', 'Local and long-distance moves, packing, and storage.', ['Local Moving', 'Long-Distance Moving', 'Packing & Unpacking', 'Furniture Moving', 'Storage Services']],
  ['Pest Control', 'Inspection, extermination, and prevention of pests.', ['General Pest Control', 'Termite Treatment', 'Bed Bug Removal', 'Rodent Control', 'Mosquito Control']],
  ['Flooring Installation', 'Hardwood, laminate, vinyl, and carpet flooring.', ['Hardwood Floor Installation', 'Laminate & Vinyl Flooring', 'Carpet Installation', 'Floor Sanding & Refinishing']],
  ['Kitchen & Bathroom Remodeling', 'Full and partial kitchen and bathroom renovations.', ['Kitchen Remodeling', 'Bathroom Remodeling', 'Shower & Tub Installation', 'Vanity Installation']],
  ['General Contracting', 'Whole-project management for builds and renovations.', ['Home Renovation', 'Home Additions', 'Basement Finishing', 'New Construction']],
  ['Locksmith', 'Lockouts, lock changes, and key cutting.', ['Emergency Lockout', 'Lock Installation & Rekeying', 'Key Duplication', 'Safe Opening']],
  ['Window & Door Installation', 'Installation and repair of windows and doors.', ['Window Replacement', 'Door Installation', 'Sliding Door Repair', 'Window Screen Repair']],
  ['Drywall & Plastering', 'Drywall hanging, finishing, and plaster repair.', ['Drywall Installation', 'Drywall Repair', 'Plastering', 'Popcorn Ceiling Removal']],
  ['Fencing & Gates', 'Fence and gate installation and repair.', ['Wood Fence Installation', 'Chain Link Fencing', 'Gate Installation', 'Fence Repair']],
  ['Concrete & Paving', 'Driveways, patios, sidewalks, and foundations.', ['Concrete Driveway', 'Patio Installation', 'Asphalt Paving', 'Foundation Repair']],
  ['Solar Panel Installation', 'Solar energy systems, batteries, and maintenance.', ['Residential Solar Installation', 'Solar Battery Storage', 'Solar Panel Cleaning', 'Solar System Repair']],
  ['Home Security & Smart Home', 'Security systems, CCTV, and home automation.', ['CCTV Installation', 'Alarm System Installation', 'Smart Home Setup', 'Video Doorbell Installation']],
  ['Interior Design', 'Space planning, decor, and home styling.', ['Room Design Consultation', 'Home Staging', 'Space Planning', 'Furniture Selection']],
  ['Pool & Spa Services', 'Pool cleaning, maintenance, and repair.', ['Pool Cleaning', 'Pool Equipment Repair', 'Pool Installation', 'Hot Tub Maintenance']],
  ['Junk Removal', 'Hauling away junk, debris, and unwanted items.', ['Household Junk Removal', 'Construction Debris Removal', 'Appliance Disposal', 'Yard Waste Removal']],
  ['Pressure Washing', 'Power washing for exteriors, decks, and driveways.', ['House Exterior Washing', 'Driveway Pressure Washing', 'Deck & Patio Washing', 'Roof Soft Washing']],
  ['Carpet & Upholstery Cleaning', 'Deep cleaning for carpets, rugs, and furniture.', ['Carpet Cleaning', 'Rug Cleaning', 'Upholstery Cleaning', 'Mattress Cleaning']],
  ['Commercial Cleaning', 'Cleaning for offices, shops, and facilities.', ['Office Cleaning', 'Retail Store Cleaning', 'Post-Construction Cleaning', 'Janitorial Services']],
  ['Tree Services', 'Tree removal, trimming, and stump grinding.', ['Tree Removal', 'Tree Trimming', 'Stump Grinding', 'Emergency Tree Service']],
  ['Insulation', 'Attic, wall, and floor insulation.', ['Attic Insulation', 'Spray Foam Insulation', 'Wall Insulation', 'Insulation Removal']],
  ['Waterproofing & Damp Proofing', 'Basement waterproofing and moisture control.', ['Basement Waterproofing', 'Roof Waterproofing', 'Damp Proofing', 'Sump Pump Installation']],
  ['Garage Door Services', 'Garage door installation and repair.', ['Garage Door Repair', 'Garage Door Installation', 'Garage Door Opener Repair', 'Spring Replacement']],
  ['Welding & Metal Fabrication', 'Custom metalwork, welding, and railings.', ['Mobile Welding', 'Metal Railing Fabrication', 'Steel Gate Fabrication', 'Metal Repair']],
  ['Cabinet & Countertop Installation', 'Cabinets, countertops, and kitchen fittings.', ['Cabinet Installation', 'Granite Countertop Installation', 'Quartz Countertop Installation', 'Cabinet Repair']],
  ['Glass & Mirror Services', 'Glass repair, mirrors, and shower enclosures.', ['Window Glass Replacement', 'Mirror Installation', 'Shower Glass Enclosure', 'Glass Table Tops']],
  ['Septic & Sewer Services', 'Septic tank and sewer line services.', ['Septic Tank Pumping', 'Sewer Line Repair', 'Septic Inspection', 'Drain Field Repair']],
  ['Mold Remediation', 'Mold inspection, removal, and prevention.', ['Mold Inspection', 'Mold Removal', 'Water Damage Restoration', 'Air Quality Testing']],
  ['Home Inspection', 'Pre-purchase and safety home inspections.', ['Pre-Purchase Inspection', 'Electrical Safety Inspection', 'Roof Inspection', 'Energy Audit']],
  ['Architecture & Drafting', 'Architectural design, plans, and drafting.', ['Architectural Design', 'Floor Plan Drafting', 'Building Permit Drawings', '3D Architectural Visualization']],
  ['Demolition & Excavation', 'Demolition, excavation, and site preparation.', ['Interior Demolition', 'Excavation', 'Land Clearing', 'Grading & Leveling']],
  ['Water Treatment & Filtration', 'Water purification and softening systems.', ['Water Filter Installation', 'Water Softener Installation', 'Reverse Osmosis Systems', 'Water Testing']],
  ['Chimney & Fireplace Services', 'Chimney sweeping, inspection, and fireplace repair.', ['Chimney Sweeping', 'Chimney Inspection', 'Fireplace Installation', 'Chimney Cap Repair']],
  ['Generator Installation & Repair', 'Backup generators and power systems.', ['Generator Installation', 'Generator Repair', 'Generator Maintenance', 'Inverter & UPS Installation']],
  ['Wallpaper Installation', 'Wallpaper hanging and removal.', ['Wallpaper Installation', 'Wallpaper Removal', 'Accent Wall Design', 'Wall Mural Installation']],
  ['Snow Removal', 'Snow plowing and ice management.', ['Driveway Snow Plowing', 'Roof Snow Removal', 'Sidewalk Shoveling', 'De-Icing Services']],
  ['Furniture Restoration & Upholstery', 'Furniture repair, refinishing, and reupholstery.', ['Furniture Reupholstery', 'Furniture Refinishing', 'Antique Restoration', 'Sofa Repair']],

  // ── Automotive ──────────────────────────────────────────────────
  ['Auto Repair & Mechanics', 'Car diagnostics, servicing, and repairs.', ['General Car Servicing', 'Engine Diagnostics', 'Brake Repair', 'Oil Change', 'Transmission Repair']],
  ['Car Detailing & Washing', 'Interior and exterior car cleaning and detailing.', ['Full Car Detailing', 'Mobile Car Wash', 'Ceramic Coating', 'Interior Deep Cleaning']],
  ['Auto Body & Paint', 'Collision repair, dents, and car painting.', ['Dent Repair', 'Collision Repair', 'Car Painting', 'Scratch Removal']],
  ['Towing & Roadside Assistance', 'Towing, jump starts, and roadside help.', ['Vehicle Towing', 'Jump Start', 'Flat Tire Change', 'Fuel Delivery']],
  ['Tire Services', 'Tire replacement, rotation, and alignment.', ['Tire Replacement', 'Wheel Alignment', 'Tire Rotation & Balancing', 'Puncture Repair']],
  ['Motorcycle Repair', 'Motorcycle and scooter servicing and repair.', ['Motorcycle Servicing', 'Motorcycle Engine Repair', 'Scooter Repair', 'Motorcycle Customization']],

  // ── Writing & translation ───────────────────────────────────────
  ['Content Writing & Copywriting', 'Articles, blogs, and marketing copy.', ['Blog Writing', 'Website Copywriting', 'Product Descriptions', 'Technical Writing']],
  ['Translation & Localization', 'Document translation and localization.', ['Document Translation', 'Website Localization', 'Certified Translation', 'Subtitling']],
  ['Proofreading & Editing', 'Proofreading, editing, and formatting.', ['Proofreading', 'Copy Editing', 'Academic Editing', 'Book Editing']],
  ['Transcription', 'Audio and video transcription.', ['Audio Transcription', 'Video Transcription', 'Medical Transcription', 'Legal Transcription']],
  ['Resume & Career Writing', 'Resumes, cover letters, and career profiles.', ['Resume Writing', 'Cover Letter Writing', 'LinkedIn Profile Optimization', 'Career Coaching']],

  // ── Marketing & sales ───────────────────────────────────────────
  ['Digital Marketing', 'Online marketing strategy and campaigns.', ['Google Ads Management', 'Facebook Ads Management', 'Email Marketing', 'Marketing Strategy']],
  ['Search Engine Optimization (SEO)', 'Rank higher on search engines.', ['On-Page SEO', 'Technical SEO', 'Local SEO', 'Link Building']],
  ['Social Media Management', 'Managing and growing social media accounts.', ['Social Media Management', 'Content Calendar Planning', 'Community Management', 'Influencer Outreach']],
  ['Sales & Lead Generation', 'Finding leads and driving sales.', ['B2B Lead Generation', 'Cold Calling', 'Appointment Setting', 'CRM Management']],
  ['Public Relations', 'Media relations and press coverage.', ['Press Release Writing', 'Media Outreach', 'Crisis Communication', 'Brand Reputation Management']],

  // ── Business & professional ─────────────────────────────────────
  ['Accounting & Bookkeeping', 'Bookkeeping, payroll, and financial records.', ['Bookkeeping', 'Payroll Processing', 'Financial Statements', 'Accounts Reconciliation']],
  ['Tax Preparation', 'Personal and business tax filing.', ['Personal Tax Filing', 'Business Tax Filing', 'Tax Planning', 'VAT & Sales Tax Filing']],
  ['Legal Services', 'Legal advice, documents, and representation.', ['Contract Drafting & Review', 'Business Registration', 'Immigration Services', 'Notary Services']],
  ['Virtual Assistance', 'Remote administrative and personal assistance.', ['Email Management', 'Calendar Management', 'Online Research', 'Administrative Support']],
  ['Customer Support', 'Customer service by chat, email, and phone.', ['Live Chat Support', 'Email Support', 'Phone Support', 'Technical Support']],
  ['Data Entry', 'Data entry, processing, and cleanup.', ['Data Entry', 'Data Cleansing', 'Spreadsheet Management', 'Web Research & Scraping']],
  ['Human Resources & Recruitment', 'Hiring, recruitment, and HR support.', ['Recruitment & Headhunting', 'HR Consulting', 'Employee Onboarding', 'Job Description Writing']],
  ['Business Consulting', 'Business strategy and planning.', ['Business Plan Writing', 'Market Research', 'Startup Consulting', 'Operations Consulting']],
  ['Project Management', 'Planning and managing projects end to end.', ['Agile & Scrum Management', 'Construction Project Management', 'IT Project Management', 'Product Management']],
  ['Financial Planning & Advisory', 'Financial advice and investment planning.', ['Financial Planning', 'Investment Advisory', 'Retirement Planning', 'Financial Modeling']],
  ['Real Estate Services', 'Buying, selling, renting, and managing property.', ['Property Management', 'Real Estate Agent', 'Property Valuation', 'Rental Management']],
  ['Insurance Services', 'Insurance advice and claims assistance.', ['Insurance Consulting', 'Claims Assistance', 'Health Insurance Advice', 'Business Insurance']],

  // ── Education & lessons ─────────────────────────────────────────
  ['Tutoring & Academic Help', 'One-on-one and group tutoring for all levels.', ['Math Tutoring', 'Science Tutoring', 'English Tutoring', 'Homework Help', 'Online Tutoring']],
  ['Language Lessons', 'Learn a new language with expert tutors.', ['English Lessons', 'Spanish Lessons', 'French Lessons', 'Arabic Lessons', 'Chinese Lessons']],
  ['Music Lessons', 'Instrument and vocal lessons.', ['Guitar Lessons', 'Piano Lessons', 'Singing Lessons', 'Drum Lessons']],
  ['Test Preparation', 'Exam coaching and test prep.', ['IELTS & TOEFL Prep', 'SAT & ACT Prep', 'GRE & GMAT Prep', 'University Entrance Prep']],
  ['Driving Lessons', 'Driving instruction and test preparation.', ['Beginner Driving Lessons', 'Driving Test Preparation', 'Defensive Driving', 'Refresher Lessons']],
  ['Coding & Tech Training', 'Programming and tech skills training.', ['Programming Lessons', 'Coding for Kids', 'Excel Training', 'Digital Skills Training']],

  // ── Health & wellness ───────────────────────────────────────────
  ['Personal Training & Fitness', 'Fitness coaching and personal training.', ['Personal Training', 'Online Fitness Coaching', 'Weight Loss Programs', 'Group Fitness Classes']],
  ['Home Nursing & Caregiving', 'Medical and personal care at home.', ['Home Nursing', 'Post-Surgery Care', 'Medication Management', 'Disability Support']],
  ['Massage Therapy', 'Therapeutic and relaxation massage.', ['Deep Tissue Massage', 'Swedish Massage', 'Sports Massage', 'Mobile Massage']],
  ['Physiotherapy', 'Rehabilitation and physical therapy.', ['Home Physiotherapy', 'Sports Injury Rehab', 'Back & Neck Pain Therapy', 'Post-Operative Rehab']],
  ['Counseling & Therapy', 'Mental health support and counseling.', ['Individual Counseling', 'Couples Therapy', 'Online Therapy', 'Life Coaching']],
  ['Nutrition & Diet Coaching', 'Personalized nutrition and meal plans.', ['Diet Planning', 'Weight Management Coaching', 'Sports Nutrition', 'Meal Prep Planning']],
  ['Yoga & Meditation', 'Yoga classes and mindfulness training.', ['Private Yoga Sessions', 'Prenatal Yoga', 'Meditation Coaching', 'Corporate Wellness Sessions']],

  // ── Beauty & personal care ──────────────────────────────────────
  ['Hair Styling & Barbering', 'Haircuts, styling, and grooming.', ['Haircut & Styling', 'Hair Coloring', 'Barber Services', 'Bridal Hair Styling']],
  ['Makeup Artistry', 'Makeup for events, weddings, and shoots.', ['Bridal Makeup', 'Party Makeup', 'Photoshoot Makeup', 'Special Effects Makeup']],
  ['Nail Services', 'Manicures, pedicures, and nail art.', ['Manicure', 'Pedicure', 'Gel & Acrylic Nails', 'Nail Art']],
  ['Skin Care & Esthetics', 'Facials, waxing, and skin treatments.', ['Facial Treatments', 'Waxing', 'Eyebrow Threading', 'Eyelash Extensions']],
  ['Tailoring & Alterations', 'Clothing alterations and custom tailoring.', ['Clothing Alterations', 'Custom Tailoring', 'Bridal Dress Alterations', 'Clothing Repair']],

  // ── Family, home life & pets ────────────────────────────────────
  ['Childcare & Babysitting', 'Babysitters, nannies, and child care.', ['Babysitting', 'Full-Time Nanny', 'After-School Care', 'Night Nanny']],
  ['Elderly Care', 'Companionship and support for seniors.', ['Senior Companionship', 'Personal Care Assistance', 'Dementia Care', 'Respite Care']],
  ['Pet Care & Grooming', 'Pet sitting, walking, and grooming.', ['Dog Walking', 'Pet Sitting', 'Pet Grooming', 'Pet Boarding']],
  ['Dog Training', 'Obedience and behavior training for dogs.', ['Puppy Training', 'Obedience Training', 'Behavior Correction', 'Service Dog Training']],
  ['Personal Chef & Catering', 'Private chefs, meal prep, and catering.', ['Private Chef', 'Event Catering', 'Weekly Meal Prep', 'Baking & Custom Cakes']],
  ['Laundry & Dry Cleaning', 'Laundry, ironing, and dry cleaning.', ['Wash & Fold Laundry', 'Dry Cleaning', 'Ironing Services', 'Curtain & Linen Cleaning']],
  ['Errands & Personal Assistance', 'Errands, shopping, and everyday tasks.', ['Grocery Shopping', 'Errand Running', 'Queue Standing', 'Personal Shopping']],

  // ── Events ──────────────────────────────────────────────────────
  ['Event Planning', 'Planning and coordinating events of any size.', ['Birthday Party Planning', 'Corporate Event Planning', 'Conference Management', 'Event Coordination']],
  ['Wedding Services', 'Everything needed for the perfect wedding.', ['Wedding Planning', 'Wedding Photography', 'Wedding Decoration', 'Wedding Officiant']],
  ['DJ & Entertainment', 'DJs, live music, and entertainers.', ['Wedding DJ', 'Party DJ', 'Live Band', 'MC & Host']],
  ['Event Rentals & Decor', 'Equipment rentals and event decoration.', ['Tent & Canopy Rental', 'Sound & Lighting Rental', 'Balloon Decoration', 'Stage Setup']],
  ['Florist', 'Flower arrangements for every occasion.', ['Wedding Flowers', 'Event Floral Arrangements', 'Bouquet Delivery', 'Funeral Flowers']],

  // ── Logistics & transport ───────────────────────────────────────
  ['Courier & Delivery', 'Same-day courier and parcel delivery.', ['Same-Day Delivery', 'Parcel Delivery', 'Document Courier', 'Food Delivery']],
  ['Freight & Trucking', 'Freight shipping and truck transport.', ['Truck Rental with Driver', 'Freight Shipping', 'Container Transport', 'Heavy Equipment Transport']],
  ['Chauffeur & Driver Services', 'Private drivers and chauffeur services.', ['Personal Driver', 'Airport Transfer', 'Wedding Car Hire', 'Corporate Chauffeur']],
  ['Warehouse & Logistics', 'Warehousing, inventory, and fulfillment.', ['Warehousing & Storage', 'Inventory Management', 'Order Fulfillment', 'Supply Chain Consulting']],

  // ── Industrial, engineering & other trades ──────────────────────
  ['Civil & Structural Engineering', 'Structural design, surveying, and site engineering.', ['Structural Design', 'Land Surveying', 'Site Engineering', 'Structural Inspection']],
  ['Mechanical Engineering', 'Mechanical design and CAD services.', ['CAD Drafting', 'Product Design', 'HVAC System Design', 'Machine Design']],
  ['Machinery Repair & Maintenance', 'Industrial equipment repair and maintenance.', ['Industrial Machine Repair', 'Preventive Maintenance', 'Hydraulic System Repair', 'Forklift Repair']],
  ['Security Guard Services', 'Security personnel for homes, events, and businesses.', ['Event Security', 'Residential Security Guard', 'Bodyguard Services', 'Commercial Security']],
  ['Facility Management', 'Building operations and maintenance.', ['Building Maintenance', 'Property Upkeep', 'Facility Operations', 'Preventive Maintenance Plans']],
  ['Agriculture & Farming', 'Farm labor, agronomy, and agricultural services.', ['Farm Labor', 'Crop Consulting', 'Irrigation System Setup', 'Livestock Care']],
  ['Manufacturing & Production', 'Contract manufacturing and production work.', ['Contract Manufacturing', 'Product Assembly', 'CNC Machining', 'Quality Control']],
  ['Marine & Boat Services', 'Boat repair, maintenance, and detailing.', ['Boat Repair', 'Boat Detailing', 'Marine Engine Service', 'Dock Installation']],
  ['Bicycle Repair', 'Bicycle servicing and repair.', ['Bike Tune-Up', 'Flat Tire Repair', 'Brake & Gear Adjustment', 'E-Bike Repair']],
  ['Watch & Jewelry Repair', 'Repair and servicing for watches and jewelry.', ['Watch Battery Replacement', 'Watch Repair', 'Jewelry Repair', 'Ring Resizing']],
  ['Shoe & Leather Repair', 'Shoe, bag, and leather goods repair.', ['Shoe Repair', 'Bag Repair', 'Leather Restoration', 'Zipper Replacement']],
];
