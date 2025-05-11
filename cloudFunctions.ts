// Minimal cloud function stub for testing and initial development
export const validateStanfordEmail = (email: string) => {
  // TODO: Implement real validation logic
  return email.endsWith('@stanford.edu');
};

// Remove seeding script and Firestore imports from here to avoid SSR issues 