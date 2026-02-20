import mongoose from 'mongoose';

/**
 * Find a post and deeply populate both post.author and post.comments.author.
 */
export async function deepPopulate(PostModel, postId) {
  return PostModel.findById(postId)
    .populate('author')
    .populate({
      path: 'comments',
      populate: {
        path: 'author',
      },
    });
}

/**
 * Create a 1:N (one-to-many) relationship: one author with multiple books.
 */
export async function createOneToMany(AuthorModel, BookModel) {
  const author = await AuthorModel.create({ name: 'J.K. Rowling' });

  const book1 = await BookModel.create({ title: 'Book One', author: author._id });
  const book2 = await BookModel.create({ title: 'Book Two', author: author._id });

  author.books.push(book1._id, book2._id);
  await author.save();

  return AuthorModel.findById(author._id).populate('books');
}

/**
 * Create a M:N (many-to-many) relationship between students and courses.
 */
export async function createManyToMany(StudentModel, CourseModel) {
  const student1 = await StudentModel.create({ name: 'Alice' });
  const student2 = await StudentModel.create({ name: 'Bob' });

  const course1 = await CourseModel.create({ title: 'Math 101' });
  const course2 = await CourseModel.create({ title: 'Science 101' });

  // Assign students to courses
  student1.courses.push(course1._id, course2._id);
  student2.courses.push(course1._id, course2._id);

  course1.students.push(student1._id, student2._id);
  course2.students.push(student1._id, student2._id);

  await Promise.all([student1.save(), student2.save(), course1.save(), course2.save()]);

  const students = await StudentModel.find().populate('courses');
  const courses = await CourseModel.find().populate('students');

  return { students, courses };
}

/**
 * Populate comments on a post but only those matching a condition.
 */
export async function populateWithMatch(PostModel, postId) {
  return PostModel.findById(postId).populate({
    path: 'comments',
    match: { approved: true },
  });
}

/**
 * Deep populate with select options at each level.
 */
export async function selectiveDeepPopulate(PostModel, postId) {
  return PostModel.findById(postId)
    .populate({
      path: 'author',
      select: 'username',
    })
    .populate({
      path: 'comments',
      populate: {
        path: 'author',
        select: 'username',
      },
    });
}
