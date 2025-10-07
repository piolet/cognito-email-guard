// src/lib/verify-password.ts
import bcrypt from "bcryptjs";
import * as argon2 from "argon2";

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
    if (!hash) return false;

    // Détection simple
    const isBcrypt = /^\$2[aby]\$/.test(hash);
    const isArgon2 = /^\$argon2(id|i|d)\$/.test(hash);

    try {
        if (isBcrypt) return await bcrypt.compare(plain, hash);
        if (isArgon2) return await argon2.verify(hash, plain);
        // Fallback (dev): égalité simple si tu as encore des comptes en clair (à proscrire en prod)
        return plain === hash;
    } catch {
        return false;
    }
}
