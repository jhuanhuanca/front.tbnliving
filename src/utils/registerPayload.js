/**
 * Payload alineado con StoreMemberRegisterRequest (Laravel).
 *
 * Backend NO usa: username, sponsor_id (se deriva de sponsor_referral_code).
 */
export function buildMemberRegisterPayload({
  name,
  email,
  password,
  passwordConfirmation,
  documentId,
  phone,
  birthDate,
  countryCode,
  countryId,
  sponsorReferralCode,
  preferredBinaryLeg,
  registrationPackageId,
}) {
  const payload = {
    name: String(name || "").trim(),
    email: String(email || "").trim().toLowerCase(),
    password: password,
    password_confirmation: passwordConfirmation,
    document_id: String(documentId || "").trim(),
    phone: String(phone || "").trim(),
    birth_date: String(birthDate || "").trim(),
    preferred_binary_leg: preferredBinaryLeg || "auto",
  };

  const code = String(countryCode || "").trim().toUpperCase();
  if (code) {
    payload.country_code = code;
  }

  const cId = parseInt(String(countryId), 10);
  if (countryId && !Number.isNaN(cId)) {
    payload.country_id = cId;
  }

  const sponsor = String(sponsorReferralCode || "").trim();
  if (sponsor) {
    payload.sponsor_referral_code = sponsor;
  }

  const pkgId = parseInt(String(registrationPackageId), 10);
  if (registrationPackageId && !Number.isNaN(pkgId)) {
    payload.registration_package_id = pkgId;
  }

  return payload;
}
