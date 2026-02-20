import mongoose from 'mongoose';

/**
 * Open a change stream on the Model. Insert a document.
 * Collect the 'insert' change event. Close the stream.
 * Return the change event.
 */
export async function watchForInserts(Model) {
  const stream = Model.watch();

  // Insert a document after opening the stream
  const insertPromise = Model.create({ name: 'NewUser', status: 'active' });
  const change = await stream.next();
  await insertPromise;

  await stream.close();
  return change;
}

/**
 * Create a document. Open a change stream. Update the doc.
 * Collect the 'update' change event. Close stream. Return event.
 */
export async function watchForUpdates(Model) {
  const doc = await Model.create({ name: 'ExistingUser', status: 'active' });

  const stream = Model.watch();

  // Delay the update slightly so the stream is ready to capture it
  setTimeout(async () => {
    await Model.findByIdAndUpdate(doc._id, { $set: { status: 'inactive' } });
  }, 100);

  const change = await stream.next();

  await stream.close();
  return change;
}

/**
 * Open a change stream with { fullDocument: 'updateLookup' }.
 * Update a document. The change event should include fullDocument.
 * Return the fullDocument from the event.
 */
export async function watchWithFullDocument(Model) {
  const doc = await Model.create({ name: 'FullDocUser', status: 'active' });

  const stream = Model.watch([], { fullDocument: 'updateLookup' });

  // Delay the update slightly so the stream is ready to capture it
  setTimeout(async () => {
    await Model.findByIdAndUpdate(doc._id, { $set: { status: 'updated' } });
  }, 100);

  const change = await stream.next();

  await stream.close();
  return change.fullDocument;
}

/**
 * Open a change stream with a pipeline filter for insert operations only.
 * Insert a doc AND update a doc. Only insert events should be captured.
 * Return the collected events.
 */
export async function watchWithFilter(Model) {
  const existingDoc = await Model.create({ name: 'FilterUser', status: 'active' });

  const pipeline = [{ $match: { operationType: 'insert' } }];
  const stream = Model.watch(pipeline);

  const events = [];

  // Set up a listener
  const collectPromise = new Promise((resolve) => {
    stream.on('change', (change) => {
      events.push(change);
    });
    // Give time for events to arrive
    setTimeout(() => resolve(), 1000);
  });

  // Insert a new document (should be captured)
  await Model.create({ name: 'InsertedUser', status: 'active' });

  // Update existing document (should NOT be captured)
  await Model.findByIdAndUpdate(existingDoc._id, { $set: { status: 'modified' } });

  await collectPromise;
  await stream.close();

  return events;
}

/**
 * Open a change stream, insert a document, get the resume token
 * from the change event. Close stream. Return the resume token.
 */
export async function getResumeToken(Model) {
  const stream = Model.watch();

  const insertPromise = Model.create({ name: 'TokenUser', status: 'active' });
  const change = await stream.next();
  await insertPromise;

  const resumeToken = change._id;

  await stream.close();
  return resumeToken;
}
