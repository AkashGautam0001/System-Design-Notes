import mongoose from 'mongoose';

/**
 * Create a User schema with firstName and lastName fields,
 * plus a fullName virtual getter that returns "firstName lastName".
 * Create a user doc and return the fullName virtual value.
 *
 * @returns {Promise<string>} The fullName virtual value
 */
export async function createSchemaWithVirtual() {
  // TODO: Create a schema with firstName and lastName
  // TODO: Add a virtual 'fullName' with a getter that returns firstName + ' ' + lastName
  // TODO: Create and save a user document
  // TODO: Return doc.fullName
  throw new Error('Not implemented');
}

/**
 * Create a schema with a fullName virtual that has both getter AND setter.
 * The setter splits "First Last" into firstName and lastName.
 * Set fullName on a doc, save, and verify firstName/lastName are set.
 *
 * @returns {Promise<Object>} The saved document
 */
export async function createVirtualSetter() {
  // TODO: Create schema with firstName, lastName
  // TODO: Add fullName virtual with getter and setter
  // TODO: The setter should split by space: this.set('firstName', ...) and this.set('lastName', ...)
  // TODO: Create a doc, set doc.fullName = 'Jane Doe', save, return the doc
  throw new Error('Not implemented');
}

/**
 * Create a schema configured to include virtuals when toJSON() is called.
 * Use the schema option { toJSON: { virtuals: true } }.
 * Create a doc, call toJSON(), and verify the virtual field is present.
 *
 * @returns {Promise<Object>} The JSON representation of the document (with virtuals)
 */
export async function ensureVirtualsInJSON() {
  // TODO: Create schema with { toJSON: { virtuals: true } }
  // TODO: Add a virtual field
  // TODO: Create a doc, call doc.toJSON()
  // TODO: Return the JSON object
  throw new Error('Not implemented');
}

/**
 * Create Author and Post schemas where Author has a virtual 'posts' field.
 * The virtual uses ref, localField, foreignField to populate posts.
 * Create an author and some posts, then populate the virtual.
 *
 * @returns {Promise<Object>} The author document with virtual posts populated
 */
export async function virtualPopulate() {
  // TODO: Create authorSchema with name field and virtual 'posts'
  //       ref: 'VPPost', localField: '_id', foreignField: 'author'
  // TODO: Create postSchema with title and author (ref to VPAuthor)
  // TODO: Create an author and 2+ posts referencing that author
  // TODO: Find the author and populate('posts')
  // TODO: Return the populated author
  throw new Error('Not implemented');
}

/**
 * Create a schema with a virtual populate using count: true.
 * This gives a count of related documents instead of the documents themselves.
 *
 * @returns {Promise<Object>} The author document with postCount virtual
 */
export async function virtualWithCount() {
  // TODO: Create authorSchema with virtual 'postCount' using count: true
  //       ref: 'VCPost', localField: '_id', foreignField: 'author', count: true
  // TODO: Create postSchema with author ref
  // TODO: Create an author and 3 posts
  // TODO: Find author and populate('postCount')
  // TODO: Return the author
  throw new Error('Not implemented');
}
