/**
 * Seeds job categories (plus starter services) into the platform.
 *
 *   npm run seed:categories
 *
 * Ordering: the array in ./data/globalCategories.ts is the display order.
 * The first entry gets the highest `priority`, the last gets the lowest, and
 * categories are listed by `priority` descending. Existing categories are
 * matched by slug or name and only have their priority updated.
 *
 * Safe to run multiple times: categories/services are never duplicated and
 * existing names, descriptions and services are never overwritten.
 */
import mongoose from 'mongoose';
import config from '../config';
import { Category } from '../app/modules/category/category.model';
import { Service } from '../app/modules/service/service.model';
import { generateSlug } from '../app/modules/category/category.service';
import { globalCategories } from './data/globalCategories';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const seedCategories = async () => {
  let createdCategories = 0;
  let reorderedCategories = 0;
  let createdServices = 0;
  const total = globalCategories.length;

  for (const [index, [name, description, services]] of globalCategories.entries()) {
    const slug = generateSlug(name);
    const priority = total - index; // first in array => highest priority

    // Already on the platform (same slug or same name)? Just set its position.
    let category = await Category.findOne({
      $or: [{ slug }, { name: new RegExp(`^${escapeRegex(name)}$`, 'i') }],
    });

    if (category) {
      await Category.updateOne({ _id: category._id }, { $set: { priority } });
      reorderedCategories++;
    } else {
      category = await Category.create({
        name,
        slug,
        description,
        isActive: true,
        priority,
      });
      createdCategories++;
    }

    if (!services.length) continue;

    // Starter services — insert only the ones that are missing.
    const ops = services.map(serviceName => {
      const serviceSlug = generateSlug(serviceName);
      return {
        updateOne: {
          filter: { category: category!._id, slug: serviceSlug },
          update: {
            $setOnInsert: {
              name: serviceName,
              slug: serviceSlug,
              category: category!._id,
              description: `${serviceName} professional service`,
              isActive: true,
            },
          },
          upsert: true,
        },
      };
    });
    const res = await Service.bulkWrite(ops, { ordered: false });
    createdServices += res.upsertedCount;
  }

  console.log(`✅ Categories created: ${createdCategories}`);
  console.log(`🔢 Existing categories re-ordered: ${reorderedCategories}`);
  console.log(`🛠️  Services created: ${createdServices}`);
};

const run = async () => {
  try {
    await mongoose.connect(config.database_url as string);
    console.log('🚀 Database connected');
    await seedCategories();
  } catch (error) {
    console.error('❌ Category seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
