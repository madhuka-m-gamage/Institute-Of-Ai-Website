import type { EnterpriseInquiry, TransmissionPayload } from '../../types';

// Firebase is loaded on submit rather than with the page, so public visitors don't download
// the Firestore/Auth SDKs unless they actually send a form. Failures propagate to the caller.
async function firestore() {
  const [{ db, auth }, { addDoc, collection }] = await Promise.all([
    import('../../lib/firebase'),
    import('firebase/firestore'),
  ]);
  return { db, auth, addDoc, collection };
}

export interface ApplicationSubmission {
  name: string;
  email: string;
  phone: string;
  courseId: string;
  courseTitle: string;
  experience: string;
}

export async function submitApplication(input: ApplicationSubmission): Promise<void> {
  const { db, auth, addDoc, collection } = await firestore();
  const name = input.name.trim();
  const phone = input.phone.trim();
  await addDoc(collection(db, 'applications'), {
    fullName: name,
    applicantName: name,
    name,
    candidateName: name,
    email: input.email.trim(),
    phone,
    courseId: input.courseId,
    courseTitle: input.courseTitle,
    background: input.experience,
    experienceLevel: input.experience,
    pythonProficiency: input.experience,
    status: 'submitted',
    notes: `Phone: ${phone} | Proficiency: ${input.experience}`,
    userId: auth.currentUser?.uid || 'guest_applicant',
    createdAt: new Date().toISOString(),
  });
}

export async function submitEnterpriseInquiry(inquiry: EnterpriseInquiry): Promise<EnterpriseInquiry> {
  const { db, auth, addDoc, collection } = await firestore();
  const payload: EnterpriseInquiry = {
    ...inquiry,
    companyName: inquiry.companyName.trim(),
    contactName: inquiry.contactName.trim(),
    workEmail: inquiry.workEmail.trim(),
    phone: inquiry.phone?.trim() || '',
    userId: auth.currentUser?.uid || 'guest_enterprise',
    createdAt: new Date().toISOString(),
  };
  await addDoc(collection(db, 'enterpriseInquiries'), payload);
  return payload;
}

export async function submitContactMessage(message: TransmissionPayload): Promise<void> {
  const { db, auth, addDoc, collection } = await firestore();
  await addDoc(collection(db, 'contactMessages'), {
    name: message.name.trim(),
    email: message.email.trim(),
    inquiryType: message.inquiryType,
    message: message.message.trim(),
    userId: auth.currentUser?.uid || 'guest_contact',
    createdAt: new Date().toISOString(),
  });
}
