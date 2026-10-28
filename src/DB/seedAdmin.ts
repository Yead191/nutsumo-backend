import { User } from '../app/modules/user/user.model';
import { Category } from '../app/modules/category/category.model';
import { Service } from '../app/modules/service/service.model';
import { generateSlug } from '../app/modules/category/category.service';
import config from '../config';
import { USER_ROLES } from '../enums/user';
import { logger } from '../shared/logger';

const payload = {
  name: 'Administrator',
  email: config.super_admin.email,
  role: USER_ROLES.SUPER_ADMIN,
  password: config.super_admin.password,
  verified: true,
};

const initialCategories = [
  {
    name: 'Plumbing',
    slug: 'plumbing',
    description: 'Leaks, fixtures, drains, and pipe work.',
    icon: 'Wrench',
    services: [
      'Bathroom Pipe Repair',
      'Drain Cleaning & Unclogging',
      'Water Heater Installation',
      'Water Leak Detection',
      'Faucet & Fixture Replacement',
      'Toilet Installation & Repair',
    ],
    status: 'active',
  },
  {
    name: 'Electrical',
    slug: 'electrical',
    description: 'Wiring, outlets, panel upgrades, and lighting.',
    icon: 'Zap',
    services: [
      'Wiring & Rewiring',
      'Circuit Breaker Replacement',
      'Indoor & Outdoor Lighting Installation',
      'Outlet & Switch Repair',
      'Ceiling Fan Installation',
      'EV Charger Setup',
    ],
    status: 'active',
  },
  {
    name: 'HVAC',
    slug: 'hvac',
    description: 'Heating, cooling, and ventilation systems.',
    icon: 'Wind',
    services: [
      'AC Repair & Servicing',
      'AC System Installation',
      'Furnace & Heating Repair',
      'Duct Cleaning & Sealing',
      'Smart Thermostat Installation',
    ],
    status: 'active',
  },
  {
    name: 'Painting',
    slug: 'painting',
    description: 'Interior and exterior painting and finish work.',
    icon: 'Paintbrush',
    services: [
      'Interior Wall & Ceiling Painting',
      'Exterior House Painting',
      'Cabinet Refinishing',
      'Drywall Patching & Prep',
      'Fence & Deck Staining',
    ],
    status: 'active',
  },
  {
    name: 'Handyman',
    slug: 'handyman',
    description: 'General repairs and small household projects.',
    icon: 'Hammer',
    services: [
      'Furniture Assembly',
      'TV Mounting & Hanging',
      'Door Lock & Handle Installation',
      'Minor Drywall & Plaster Repair',
      'Caulking & Weatherstripping',
    ],
    status: 'active',
  },
  {
    name: 'Carpentry & Woodwork',
    slug: 'carpentry',
    description: 'Cabinetry, framing, furniture, and woodwork repairs.',
    icon: 'FolderPlus',
    services: [
      'Custom Cabinetry',
      'Door & Window Framing',
      'Baseboard & Crown Molding',
      'Deck Building & Restoration',
      'Wood Furniture Repair',
    ],
    status: 'active',
  },
  {
    name: 'Appliance Repair',
    slug: 'appliance-repair',
    description: 'Repair and maintenance for major home appliances.',
    icon: 'Cpu',
    services: [
      'Refrigerator & Freezer Repair',
      'Washing Machine & Dryer Repair',
      'Dishwasher Diagnosis & Repair',
      'Oven & Range Stove Repair',
    ],
    status: 'active',
  },
  {
    name: 'Roofing',
    slug: 'roofing',
    description: 'Repair, replacement, inspection, and gutters.',
    icon: 'Home',
    services: [
      'Roof Leak Repair',
      'Shingle & Tile Replacement',
      'Gutter Installation & Cleaning',
      'Complete Roof Inspection',
    ],
    status: 'active',
  },
  {
    name: 'Masonry & Tile',
    slug: 'masonry-tile',
    description: 'Brick, stone, grout, and tile installation & repair.',
    icon: 'Layers',
    services: [
      'Kitchen Backsplash Tile Installation',
      'Bathroom Floor & Wall Tiling',
      'Brick & Chimney Tuckpointing',
      'Tile Grouting & Sealing',
      'Stone Paver Installation',
    ],
    status: 'active',
  },
  {
    name: 'Landscaping',
    slug: 'landscaping',
    description: 'Lawn, garden, tree, and outdoor work.',
    icon: 'Trees',
    services: [
      'Lawn Mowing & Edge Trimming',
      'Tree & Shrub Pruning',
      'Mulch & Soil Installation',
      'Sprinkler & Irrigation Repair',
      'Garden Bed Design',
    ],
    status: 'active',
  },
  {
    name: 'House Cleaning',
    slug: 'house-cleaning',
    description: 'Standard, deep, and move-out home cleaning.',
    icon: 'Sparkles',
    services: [
      'Deep Cleaning',
      'Move-in / Move-out Cleaning',
      'Standard Housekeeping',
      'Window & Glass Cleaning',
      'Carpet Steam Cleaning',
    ],
    status: 'active',
  },
];

export const seedSuperAdmin = async () => {
  const isExistSuperAdmin = await User.findOne({
    email: config.super_admin.email,
    role: USER_ROLES.SUPER_ADMIN,
  });
  if (!isExistSuperAdmin) {
    await User.create(payload);
    logger.info('✨ Super Admin account has been successfully created!');
  }

  // Seed or sync default admin categories and catalog services
  for (const cat of initialCategories) {
    const categoryDoc = await Category.findOneAndUpdate(
      { slug: cat.slug },
      {
        $set: {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          isActive: true,
        },
      },
      { upsert: true, new: true },
    );

    if (categoryDoc && cat.services && Array.isArray(cat.services)) {
      for (const serviceName of cat.services) {
        const serviceSlug = generateSlug(serviceName);
        await Service.findOneAndUpdate(
          {
            category: categoryDoc._id,
            slug: serviceSlug,
          },
          {
            $set: {
              name: serviceName,
              slug: serviceSlug,
              category: categoryDoc._id,
              description: `${serviceName} professional service`,
              isActive: true,
            },
          },
          { upsert: true, new: true },
        );
      }
    }
  }
  logger.info('✨ Admin Categories and Services catalog synchronized!');
};
