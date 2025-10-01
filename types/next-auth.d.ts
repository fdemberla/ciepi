import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    idToken?: string;
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin?: boolean; // true if user is in usuarios_administradores table
      adminId?: number; // ID from usuarios_administradores table
      rolId?: number; // rol_id from usuarios_administradores table
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    idToken?: string;
    isAdmin?: boolean; // true if user is in usuarios_administradores table
    adminId?: number; // ID from usuarios_administradores table
    rolId?: number; // rol_id from usuarios_administradores table
  }
}
