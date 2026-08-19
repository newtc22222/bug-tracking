import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return null;
        }

        const adminUser = await prisma.adminUser.findUnique({ where: { email } });
        if (!adminUser) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, adminUser.passwordHash);
        if (!passwordMatches) {
          return null;
        }

        return {
          id: adminUser.id,
          email: adminUser.email,
        };
      },
    }),
  ],
});
