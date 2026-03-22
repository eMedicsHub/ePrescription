This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

### Roles & Administration

The application now supports a `SUPER_ADMIN` role in addition to existing roles (ADMIN, DOCTOR, PHARMACIST, PATIENT).

- A **super admin** account (username `admin`, password `admin`) is seeded via `seed-super-admin.ts` and can create regular administrators.
- **Administrators** can add medicines using the admin portal. Access to the admin area is restricted to users with role `ADMIN` **or** `SUPER_ADMIN`.
- Regular registration via the public form is limited to doctors, pharmacists, and patients; elevated roles cannot be self‑assigned.

To apply the new `SUPER_ADMIN` role you'll need to update your database schema:

```bash
echo "npx prisma migrate dev --name add_super_admin_role"  # run migration and regenerate client
node seed-super-admin.ts                                    # ensure super admin exists
```



## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
