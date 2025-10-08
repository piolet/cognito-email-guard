import bcrypt from "bcryptjs";

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
    if (!hash) return false;

    // Détection simple
    const isBcrypt = /^\$2[aby]\$/.test(hash);

    try {
        if (isBcrypt) return await bcrypt.compare(plain, hash);
        return plain === hash;
    } catch {
        return false;
    }
}
