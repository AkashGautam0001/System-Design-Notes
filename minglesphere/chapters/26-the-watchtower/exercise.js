import mongoose from 'mongoose';

/**
 * Open a change stream on the Model. Insert a document.
 * Collect the 'insert' change event. Close the stream.
 * Return the change event.
 *
 * @param {mongoose.Model} Model - A Mongoose model
 * @returns {Promise<Object>} The change event with operationType: 'insert'
 */
export async function watchForInserts(Model) {
  // TODO: Open a change stream with Model.watch()
  // TODO: Insert a document into the model
  // TODO: Use stream.next() to get the change event
  // TODO: Close the stream with stream.close()
  // TODO: Return the change event
  throw new Error('Not implemented');
}

/**
 * Create a document. Open a change stream. Update the doc.
 * Collect the 'update' change event. Close stream. Return event.
 *
 * @param {mongoose.Model} Model - A Mongoose model
 * @returns {Promise<Object>} The change event with operationType: 'update'
 */
export async function watchForUpdates(Model) {
  // TODO: Create a document first
  // TODO: Open a change stream with Model.watch()
  // TODO: Update the document
  // TODO: Use stream.next() to get the change event
  // TODO: Close the stream
  // TODO: Return the change event
  throw new Error('Not implemented');
}

/**
 * Open a change stream with { fullDocument: 'updateLookup' }.
 * Update a document. The change event should include fullDocument.
 * Return the fullDocument from the event.
 *
 * @param {mongoose.Model} Model - A Mongoose model
 * @returns {Promise<Object>} The fullDocument from the change event
 */
export async function watchWithFullDocument(Model) {
  // TODO: Create a document
  // TODO: Open a change stream with { fullDocument: 'updateLookup' }
  // TODO: Update the document
  // TODO: Use stream.next() to get the change event
  // TODO: Close the stream
  // TODO: Return change.fullDocument
  throw new Error('Not implemented');
}

/**
 * Open a change stream with a pipeline filter for insert operations only.
 * Insert a doc AND update a doc. Only insert events should be captured.
 * Return the collected events.
 *
 * @param {mongoose.Model} Model - A Mongoose model
 * @returns {Promise<Array>} Array of change events (only inserts)
 */
export async function watchWithFilter(Model) {
  // TODO: Create an initial document (before opening the stream)
  // TODO: Open a change stream with pipeline: [{ $match: { operationType: 'insert' } }]
  // TODO: Insert a new document
  // TODO: Update the initial document
  // TODO: Collect events using stream.next() or event listeners with a timeout
  // TODO: Close the stream
  // TODO: Return collected events (should only contain insert events)
  throw new Error('Not implemented');
}

/**
 * Open a change stream, insert a document, get the resume token
 * from the change event. Close stream. Return the resume token.
 *
 * @param {mongoose.Model} Model - A Mongoose model
 * @returns {Promise<Object>} The resume token (a truthy object)
 */
export async function getResumeToken(Model) {
  // TODO: Open a change stream with Model.watch()
  // TODO: Insert a document
  // TODO: Use stream.next() to get the change event
  // TODO: Extract the resume token from change._id
  // TODO: Close the stream
  // TODO: Return the resume token
  throw new Error('Not implemented');
}
