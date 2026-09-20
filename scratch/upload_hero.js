const cloudinary = require('C:/Users/salih/Desktop/aldimobilya/node_modules/.pnpm/cloudinary@2.11.0/node_modules/cloudinary/cloudinary.js').v2;
const { PrismaClient } = require('C:/Users/salih/Desktop/aldimobilya/packages/db/node_modules/@prisma/client');

cloudinary.config({
  cloud_name: 'e8kfofqy',
  api_key: '529854688157775',
  api_secret: 'Gl-way6H4zBDAs_KRvNSJAb5Wok',
  secure: true
});

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_oYU5Llin2mCI@ep-calm-moon-b1gy463b-pooler.c-5.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'
    }
  }
});

async function main() {
  console.log('Uploading image 1 to Cloudinary...');
  const res1 = await cloudinary.uploader.upload(
    'C:/Users/salih/.gemini/antigravity-ide/brain/56a441c5-b264-4a5c-8c06-7cdfec01e46f/hero_credenza_wide_1789830823409.jpg',
    { folder: 'aldimobilya/hero' }
  );
  console.log('Image 1 uploaded:', res1.secure_url);

  console.log('Uploading image 2 to Cloudinary...');
  const res2 = await cloudinary.uploader.upload(
    'C:/Users/salih/.gemini/antigravity-ide/brain/56a441c5-b264-4a5c-8c06-7cdfec01e46f/hero_dining_wide_1789830846227.jpg',
    { folder: 'aldimobilya/hero' }
  );
  console.log('Image 2 uploaded:', res2.secure_url);

  await prisma.siteSettings.update({
    where: { id: 'main' },
    data: {
      heroImages: {
        images: [res1.secure_url, res2.secure_url],
        autoplay: true,
        intervalMs: 6500
      }
    }
  });
  console.log('Database updated successfully with new 16:9 hero images!');
}

main()
  .then(() => prisma.$disconnect())
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
