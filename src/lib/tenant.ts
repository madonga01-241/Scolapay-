import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { Role } from "@prisma/client";

export class TenantAccessError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

export type TenantContext = {
  userId: string;
  role: Role;
  schoolId: string; // jamais null ici : un SUPER_ADMIN passe par un autre chemin
};

/**
 * Récupère le contexte de la requête courante et garantit qu'un schoolId
 * est présent. À utiliser dans TOUTE route ou server action qui touche à
 * des données appartenant à une école (élèves, paiements, échéanciers...).
 *
 * C'est le point de passage obligé qui empêche une école A de lire/écrire
 * les données d'une école B : on ne fait jamais confiance à un schoolId
 * envoyé par le client, uniquement à celui de la session serveur.
 */
export async function requireTenantContext(): Promise<TenantContext> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new TenantAccessError("Non authentifié", 401);
  }

  if (session.user.role === Role.SUPER_ADMIN) {
    throw new TenantAccessError(
      "Ce point d'accès requiert un compte rattaché à une école",
      403
    );
  }

  if (!session.user.schoolId) {
    throw new TenantAccessError("Compte non rattaché à une école", 403);
  }

  return {
    userId: session.user.id,
    role: session.user.role,
    schoolId: session.user.schoolId,
  };
}

/**
 * Vérifie qu'un rôle fait partie de la liste autorisée pour l'action en cours.
 * Usage : requireRole(ctx, [Role.SCHOOL_ADMIN, Role.ACCOUNTANT])
 */
export function requireRole(ctx: TenantContext, allowed: Role[]) {
  if (!allowed.includes(ctx.role)) {
    throw new TenantAccessError(
      `Rôle ${ctx.role} non autorisé pour cette action`,
      403
    );
  }
}

/**
 * Un parent ne doit voir que SES enfants. Ce garde-fou est utilisé en plus
 * du filtre schoolId dès qu'une requête cible un `parentId` ou un `studentId`.
 */
export function assertParentOwnsResource(
  ctx: TenantContext,
  resourceParentUserId: string
) {
  if (ctx.role !== Role.PARENT) return; // règle uniquement pertinente pour les parents
  if (ctx.userId !== resourceParentUserId) {
    throw new TenantAccessError("Accès refusé à cette ressource", 403);
  }
}
