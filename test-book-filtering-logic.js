// Test script to check if the book filtering logic is working correctly

// Simulate the data that would come from the database
const systemBooks = [
  { id: '1', title: 'English Book 1', grade: 'Grade 1', subject: 'English' },
  { id: '2', title: 'English Book 2', grade: 'Grade 2', subject: 'English' },
  { id: '3', title: 'Math Book 1', grade: 'Grade 1', subject: 'Mathematics' },
  { id: '4', title: 'Science Book 1', grade: 'Grade 8', subject: 'Science' },
];

// User selects this from dropdown
const selectedGrade = 'Class 1';
const selectedSubject = 'English';

// This is the normalizeGrade function from QuestionCreationModePage.tsx
const normalizeGrade = (grade) => {
  // Extract just the number: "Grade 1" -> "1", "Class 1" -> "1", "1" -> "1"
  return grade.replace(/^(Grade|Class)\s+/i, '').trim();
};

// This is the filtering logic from getAvailableBooks
const booksForSubject = systemBooks.filter((book) => {
  const bookSubject = book.subject.toString().trim().toLowerCase();
  const selectedSubjectLower = selectedSubject.toString().trim().toLowerCase();
  return bookSubject === selectedSubjectLower;
});

console.log('Books for selected subject:', booksForSubject);

const selectedGradeNormalized = normalizeGrade(selectedGrade);
console.log('Selected grade normalized:', selectedGradeNormalized);

const filteredBooks = booksForSubject.filter((book) => {
  const bookGrade = normalizeGrade(book.grade.toString());
  const matches = bookGrade === selectedGradeNormalized;
  console.log(`  Book "${book.title}": grade="${book.grade}", normalized="${bookGrade}", matches=${matches}`);
  return matches;
});

console.log('\nFiltered books:', filteredBooks);
console.log(`\nResult: ${filteredBooks.length} books found`);

if (filteredBooks.length === 0) {
  console.log('\n❌ NO BOOKS FOUND - User will see "Enter book name manually" message');
} else {
  console.log('\n✅ BOOKS FOUND - User will see dropdown with books');
}
