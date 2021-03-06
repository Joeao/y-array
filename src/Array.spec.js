/* global createUsers, databases, wait, compareAllUsers, getRandomNumber, applyRandomTransactionsNoGCNoDisconnect, applyRandomTransactionsAllRejoinNoGC, applyRandomTransactionsWithGC, async, garbageCollectAllUsers, describeManyTimes */
/* eslint-env browser,jasmine */
'use strict'

var Y = require('../../yjs/src/SpecHelper.js')

function compareEvent (is, should) {
  expect(is.length).toEqual(should.length)
  for (var i = 0; i < is.length; i++) {
    for (var key in should[i]) {
      expect(should[i][key]).toEqual(is[i][key])
    }
  }
}

var numberOfYArrayTests = 25
var repeatArrayTests = 75

for (let database of databases) {
  describe(`Array Type (DB: ${database})`, function () {
    var y1, y2, y3, yconfig1, yconfig2, yconfig3, flushAll

    beforeEach(async(function * (done) {
      yield createUsers(this, 3, database)
      y1 = (yconfig1 = this.users[0]).share.root
      y2 = (yconfig2 = this.users[1]).share.root
      y3 = (yconfig3 = this.users[2]).share.root
      flushAll = Y.utils.globalRoom.flushAll
      yield wait(10)
      done()
    }))
    afterEach(async(function * (done) {
      yield compareAllUsers(this.users)
      done()
    }))

    describe('Basic tests', function () {
      it('insert three elements, try re-get property', async(function * (done) {
        var array = yield y1.set('Array', Y.Array)
        array.insert(0, [1, 2, 3])
        array = yield y1.get('Array') // re-get property
        expect(array.toArray()).toEqual([1, 2, 3])
        done()
      }))
      it('Basic insert in array (handle three conflicts)', async(function * (done) {
        yield y1.set('Array', Y.Array)
        yield flushAll()
        var l1 = yield y1.get('Array')
        l1.insert(0, [0])
        var l2 = yield y2.get('Array')
        l2.insert(0, [1])
        var l3 = yield y3.get('Array')
        l3.insert(0, [2])
        yield flushAll()
        expect(l1.toArray()).toEqual(l2.toArray())
        expect(l2.toArray()).toEqual(l3.toArray())
        done()
      }))
      it('Basic insert&delete in array (handle three conflicts)', async(function * (done) {
        var l1, l2, l3
        l1 = yield y1.set('Array', Y.Array)
        l1.insert(0, ['x', 'y', 'z'])
        yield flushAll()
        l1.insert(1, [0])
        l2 = yield y2.get('Array')
        l2.delete(0)
        l2.delete(1)
        l3 = yield y3.get('Array')
        l3.insert(1, [2])
        yield flushAll()
        expect(l1.toArray()).toEqual(l2.toArray())
        expect(l2.toArray()).toEqual(l3.toArray())
        expect(l2.toArray()).toEqual([0, 2, 'y'])
        done()
      }))
      it('Handles getOperations ascending ids bug in late sync', async(function * (done) {
        var l1, l2
        l1 = yield y1.set('Array', Y.Array)
        l1.insert(0, ['x', 'y'])
        yield flushAll()
        yconfig3.disconnect()
        yconfig2.disconnect()
        yield wait()
        l2 = yield y2.get('Array')
        l2.insert(1, [2])
        l2.insert(1, [3])
        yield yconfig2.reconnect()
        yield yconfig3.reconnect()
        expect(l1.toArray()).toEqual(l2.toArray())
        done()
      }))
      it('Handles deletions in late sync', async(function * (done) {
        var l1, l2
        l1 = yield y1.set('Array', Y.Array)
        l1.insert(0, ['x', 'y'])
        yield flushAll()
        yield yconfig2.disconnect()
        yield wait()
        l2 = yield y2.get('Array')
        l2.delete(1, 1)
        l1.delete(0, 2)
        yield yconfig2.reconnect()
        expect(l1.toArray()).toEqual(l2.toArray())
        done()
      }))
      it('Handles deletions in late sync (2)', async(function * (done) {
        var l1, l2
        l1 = yield y1.set('Array', Y.Array)
        yield flushAll()
        l2 = yield y2.get('Array')
        l1.insert(0, ['x', 'y'])
        yield wait()
        yield flushAll()
        l1.delete(0, 2)
        yield wait()
        yield flushAll()
        expect(l1.toArray()).toEqual(l2.toArray())
        done()
      }))
      it('Handles deletions in late sync (3)', async(function * (done) {
        var l1, l2
        l1 = yield y1.set('Array', Y.Array)
        yield flushAll()
        l2 = yield y2.get('Array')
        l1.insert(0, ['x', 'y'])
        l1.delete(0, 2)
        yield flushAll()
        expect(l1.toArray()).toEqual(l2.toArray())
        done()
      }))
      it('Basic insert. Then delete the whole array', async(function * (done) {
        var l1, l2, l3
        l1 = yield y1.set('Array', Y.Array)
        l1.insert(0, ['x', 'y', 'z'])
        yield flushAll()
        l1.delete(0, 3)
        l2 = yield y2.get('Array')
        l3 = yield y3.get('Array')
        yield flushAll()
        expect(l1.toArray()).toEqual(l2.toArray())
        expect(l2.toArray()).toEqual(l3.toArray())
        expect(l2.toArray()).toEqual([])
        done()
      }))
      it('Basic insert. Then delete the whole array (merge listeners on late sync)', async(function * (done) {
        var l1, l2, l3
        l1 = yield y1.set('Array', Y.Array)
        l1.insert(0, ['x', 'y', 'z'])
        yield flushAll()
        yield yconfig2.disconnect()
        l1.delete(0, 3)
        l2 = yield y2.get('Array')
        yield wait()
        yield yconfig2.reconnect()
        yield wait()
        l3 = yield y3.get('Array')
        yield flushAll()
        expect(l1.toArray()).toEqual(l2.toArray())
        expect(l2.toArray()).toEqual(l3.toArray())
        expect(l2.toArray()).toEqual([])
        done()
      }))
      // TODO?
      /* it('Basic insert. Then delete the whole array (merge deleter on late sync)', async(function * (done) {
        var l1, l2, l3
        l1 = yield y1.set('Array', Y.Array)
        l1.insert(0, ['x', 'y', 'z'])
        yield flushAll()
        yconfig1.disconnect()
        l1.delete(0, 3)
        l2 = yield y2.get('Array')
        yield yconfig1.reconnect()
        l3 = yield y3.get('Array')
        yield flushAll()
        expect(l1.toArray()).toEqual(l2.toArray())
        expect(l2.toArray()).toEqual(l3.toArray())
        expect(l2.toArray()).toEqual([])
        done()
      })) */
      it('throw insert & delete events', async(function * (done) {
        var array = yield this.users[0].share.root.set('array', Y.Array)
        var event
        array.observe(function (e) {
          event = e
        })
        array.insert(0, [0, 1, 2])
        compareEvent(event, [{
          type: 'insert',
          index: 0,
          values: [0, 1, 2],
          length: 3
        }])
        array.delete(0)
        compareEvent(event, [{
          type: 'delete',
          index: 0,
          length: 1,
          values: [0]
        }])
        array.delete(0, 2)
        compareEvent(event, [{
          type: 'delete',
          index: 0,
          length: 2,
          values: [1, 2]
        }])
        yield wait(50)
        done()
      }))
      it('throw insert & delete events for types', async(function * (done) {
        var array = yield this.users[0].share.root.set('array', Y.Array)
        var event
        array.observe(function (e) {
          event = e
        })
        array.insert(0, [Y.Array])
        delete event[0].values
        compareEvent(event, [{
          type: 'insert',
          object: array,
          index: 0,
          length: 1
        }])
        var type = yield array.get(0)
        expect(type._model).toBeTruthy()
        array.delete(0)
        delete event[0].values
        compareEvent(event, [{
          type: 'delete',
          object: array,
          index: 0,
          length: 1
        }])
        yield wait(50)
        yield garbageCollectAllUsers(this.users)
        // expect(type._content == null).toBeTruthy() TODO: make sure everything is cleaned up!
        done()
      }))
      it('throw insert & delete events for types (2)', async(function * (done) {
        var array = yield this.users[0].share.root.set('array', Y.Array)
        var event
        array.observe(function (e) {
          event = e
        })
        array.insert(0, ['hi', Y.Map])
        delete event[1].values
        compareEvent(event, [{
          type: 'insert',
          object: array,
          index: 0,
          length: 1,
          values: ['hi']
        },
        {
          type: 'insert',
          object: array,
          index: 1,
          length: 1
        }])
        array.delete(1)
        delete event[0].values
        compareEvent(event, [{
          type: 'delete',
          object: array,
          index: 1,
          length: 1
        }])
        yield wait(50)
        done()
      }))
      it('garbage collects', async(function * (done) {
        var l1, l2, l3
        l1 = yield y1.set('Array', Y.Array)
        l1.insert(0, ['x', 'y', 'z'])
        yield flushAll()
        yconfig1.disconnect()
        l1.delete(0, 3)
        l2 = yield y2.get('Array')
        yield wait()
        yield yconfig1.reconnect()
        yield wait()
        l3 = yield y3.get('Array')
        yield flushAll()
        yield garbageCollectAllUsers(this.users)
        expect(l1.toArray()).toEqual(l2.toArray())
        expect(l2.toArray()).toEqual(l3.toArray())
        expect(l2.toArray()).toEqual([])
        done()
      }))
      it('Debug after implementing "content is an array" (1)', async(function * (done) {
        this.users[1].db.requestTransaction(function * asItShouldBe () {
          yield* this.store.tryExecute.call(this, {'id': ['_', 'Map_Map_root_'], 'map': {}, 'struct': 'Map', 'type': 'Map'})
          yield* this.store.tryExecute.call(this, {'struct': 'List', 'id': ['315', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this, {'id': ['315', 1], 'left': null, 'right': null, 'origin': null, 'parent': ['_', 'Map_Map_root_'], 'struct': 'Insert', 'parentSub': 'Array', 'opContent': ['315', 0]})
          yield* this.store.tryExecute.call(this, {'id': ['315', 2], 'left': null, 'right': null, 'origin': null, 'parent': ['315', 0], 'struct': 'Insert', 'content': [8195]})
          yield* this.store.tryExecute.call(this, {'id': ['317', 0], 'left': null, 'right': null, 'origin': null, 'parent': ['315', 0], 'struct': 'Insert', 'content': [333]})
          yield* this.store.tryExecute.call(this, {'id': ['317', 1], 'left': null, 'right': ['317', 0], 'origin': null, 'parent': ['315', 0], 'struct': 'Insert', 'content': [6880]})
          yield* this.store.tryExecute.call(this, {'id': ['317', 2], 'left': ['317', 1], 'right': ['317', 0], 'origin': ['317', 1], 'parent': ['315', 0], 'struct': 'Insert', 'content': [5725]})
        })

        this.users[2].db.requestTransaction(function * () {
          yield* this.store.tryExecute.call(this, {'id': ['_', 'Map_Map_root_'], 'map': {}, 'struct': 'Map', 'type': 'Map'})
          yield* this.store.tryExecute.call(this, {'struct': 'List', 'id': ['315', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this, {'id': ['315', 1], 'left': null, 'right': null, 'origin': null, 'parent': ['_', 'Map_Map_root_'], 'struct': 'Insert', 'parentSub': 'Array', 'opContent': ['315', 0]})
          yield* this.store.tryExecute.call(this, {'struct': 'List', 'id': ['315', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this, {'left': null, 'origin': null, 'parent': ['315', 0], 'struct': 'Insert', 'content': [333], 'id': ['317', 0], 'right': null})
          yield* this.store.tryExecute.call(this, {'left': null, 'origin': null, 'parent': ['315', 0], 'struct': 'Insert', 'content': [6880], 'id': ['317', 1], 'right': ['317', 0]})
          yield* this.store.tryExecute.call(this, {'left': ['317', 1], 'origin': ['317', 1], 'parent': ['315', 0], 'struct': 'Insert', 'content': [5725], 'id': ['317', 2], 'right': ['317', 0]})
          yield* this.store.tryExecute.call(this, {'id': ['315', 2], 'left': null, 'right': null, 'origin': null, 'parent': ['315', 0], 'struct': 'Insert', 'content': [8195]})
        })

        yield wait(100)

        yield compareAllUsers([this.users[1], this.users[2]])
        done()
      }))
      it('Debug after implementing "content is an array" (2)', async(function * (done) {
        this.users[0].db.requestTransaction(function * asItShouldBe () {
          yield* this.store.tryExecute.call(this, {'id': ['_', 'Map_Map_root_'], 'map': {}, 'struct': 'Map', 'type': 'Map'})
          yield* this.store.tryExecute.call(this, {'start': null, 'end': null, 'struct': 'List', 'id': ['114', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this, {'left': null, 'right': null, 'origin': null, 'parent': ['_', 'Map_Map_root_'], 'parentSub': 'Array', 'struct': 'Insert', 'opContent': ['114', 0], 'id': ['114', 1]})
          yield* this.store.tryExecute.call(this, {'left': null, 'origin': null, 'parent': ['114', 0], 'struct': 'Insert', 'content': [1778, 1778], 'id': ['114', 2], 'right': null})
          yield* this.store.tryExecute.call(this, {'id': ['116', 0], 'left': null, 'right': null, 'origin': null, 'parent': ['114', 0], 'struct': 'Insert', 'content': [1259]})
          yield* this.store.tryExecute.call(this, {'id': ['116', 1], 'left': ['116', 0], 'right': null, 'origin': ['116', 0], 'parent': ['114', 0], 'struct': 'Insert', 'content': [1259]})
          yield* this.store.tryExecute.call(this, {'id': ['116', 2], 'left': ['116', 0], 'right': ['116', 1], 'origin': ['116', 0], 'parent': ['114', 0], 'struct': 'Insert', 'content': [6359, 6359]})
          console.log('done1')
        })

        this.users[1].db.requestTransaction(function * () {
          yield* this.store.tryExecute.call(this, {'id': ['_', 'Map_Map_root_'], 'map': {}, 'struct': 'Map', 'type': 'Map'})
          yield* this.store.tryExecute.call(this, {'struct': 'List', 'id': ['114', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this, {'id': ['114', 1], 'left': null, 'right': null, 'origin': null, 'parent': ['_', 'Map_Map_root_'], 'struct': 'Insert', 'parentSub': 'Array', 'opContent': ['114', 0]})
          yield* this.store.tryExecute.call(this, {'struct': 'List', 'id': ['114', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this, {'id': ['114', 1], 'left': null, 'right': null, 'origin': null, 'parent': ['_', 'Map_Map_root_'], 'struct': 'Insert', 'parentSub': 'Array', 'opContent': ['114', 0]})
          yield* this.store.tryExecute.call(this, {'struct': 'List', 'id': ['114', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this, {'id': ['114', 1], 'left': null, 'right': null, 'origin': null, 'parent': ['_', 'Map_Map_root_'], 'struct': 'Insert', 'parentSub': 'Array', 'opContent': ['114', 0]})
          yield* this.store.tryExecute.call(this, {'id': ['116', 0], 'left': null, 'right': null, 'origin': null, 'parent': ['114', 0], 'struct': 'Insert', 'content': [1259, 1259]})
          yield* this.store.tryExecute.call(this, {'id': ['116', 2], 'left': ['116', 0], 'right': ['116', 1], 'origin': ['116', 0], 'parent': ['114', 0], 'struct': 'Insert', 'content': [6359, 6359]})
          yield* this.store.tryExecute.call(this, {'id': ['114', 2], 'left': null, 'right': ['116', 0], 'origin': null, 'parent': ['114', 0], 'struct': 'Insert', 'content': [1778, 1778]})
          console.log('done2')
        })

        yield wait(100)

        yield compareAllUsers([this.users[0], this.users[1]])
        done()
      }))
      it('Debug after implementing "content is an array" (3)', async(function * (done) {
        this.users[0].db.requestTransaction(function * () {
          yield* this.store.tryExecute.call(this, {'id': ['_', 'Map_Map_root_'], 'map': {}, 'struct': 'Map', 'type': 'Map'})
          yield* this.store.tryExecute.call(this, {'struct': 'List', 'id': ['117', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this, {'id': ['117', 1], 'left': null, 'right': null, 'origin': null, 'parent': ['_', 'Map_Map_root_'], 'struct': 'Insert', 'parentSub': 'Array', 'opContent': ['117', 0]})
          yield* this.store.tryExecute.call(this, {'struct': 'List', 'id': ['117', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this, {'id': ['117', 1], 'left': null, 'right': null, 'origin': null, 'parent': ['_', 'Map_Map_root_'], 'struct': 'Insert', 'parentSub': 'Array', 'opContent': ['117', 0]})
          yield* this.store.tryExecute.call(this, {'struct': 'List', 'id': ['117', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this, {'id': ['117', 1], 'left': null, 'right': null, 'origin': null, 'parent': ['_', 'Map_Map_root_'], 'struct': 'Insert', 'parentSub': 'Array', 'opContent': ['117', 0]})
          yield* this.store.tryExecute.call(this, {'left': null, 'origin': null, 'parent': ['117', 0], 'struct': 'Insert', 'content': [1175, 1176], 'id': ['118', 0], 'right': null})
          yield* this.store.tryExecute.call(this, {'id': ['117', 2], 'left': null, 'right': null, 'origin': null, 'parent': ['117', 0], 'struct': 'Insert', 'content': [1249, 1250, 1251, 1252, 1253, 1254, 1255, 1256, 1257]})
          yield* this.store.tryExecute.call(this, {'id': ['119', 0], 'left': ['117', 10], 'right': null, 'origin': ['117', 10], 'parent': ['117', 0], 'struct': 'Insert', 'content': [2715, 2716, 2717, 2718, 2719, 2720]})
          yield* this.store.tryExecute.call(this, {'target': ['118', 1], 'struct': 'Delete'})
          yield* this.store.tryExecute.call(this, {'left': ['117', 2], 'origin': ['117', 2], 'parent': ['117', 0], 'struct': 'Insert', 'content': [6013, 6014, 6015, 6016, 6017, 6018, 6019, 6020, 6021], 'id': ['118', 2], 'right': ['117', 3]})
          yield* this.store.tryExecute.call(this, {'target': ['117', 2], 'struct': 'Delete'})
          yield* this.store.tryExecute.call(this, {'target': ['118', 5], 'struct': 'Delete'})
          yield* this.store.tryExecute.call(this, {'target': ['119', 1], 'struct': 'Delete'})
          yield* this.store.tryExecute.call(this, {'target': ['117', 5], 'struct': 'Delete'})
          yield* this.store.tryExecute.call(this, {'target': ['119', 1], 'struct': 'Delete'})
          yield* this.store.tryExecute.call(this, {'target': ['117', 9], 'struct': 'Delete'})
          yield* this.store.tryExecute.call(this, {'target': ['117', 8], 'struct': 'Delete'})
          yield* this.store.tryExecute.call(this, {'target': ['117', 13], 'struct': 'Delete'})
          yield* this.store.tryExecute.call(this, {'target': ['117', 15], 'struct': 'Delete'})
          yield* this.store.tryExecute.call(this, {'target': ['117', 15], 'struct': 'Delete'})
          yield* this.store.tryExecute.call(this, {'id': ['117', 11], 'left': ['117', 6], 'right': ['117', 7], 'origin': ['117', 6], 'parent': ['117', 0], 'struct': 'Insert', 'content': [6498, 6499, 6500, 6501, 6502, 6503, 6504, 6505]})
          yield* this.store.tryExecute.call(this, {'struct': 'Delete', 'target': ['117', 13]})
          yield* this.store.tryExecute.call(this, {'id': ['119', 6], 'left': ['117', 5], 'right': ['117', 6], 'origin': ['117', 5], 'parent': ['117', 0], 'struct': 'Insert', 'content': [777, 778, 779, 780, 781, 782, 783, 784, 785]})
          yield* this.store.tryExecute.call(this, {'id': ['117', 19], 'left': ['117', 17], 'right': ['117', 18], 'origin': ['117', 17], 'parent': ['117', 0], 'struct': 'Insert', 'content': [7283]})
          yield* this.store.tryExecute.call(this, {'id': ['119', 15], 'left': ['117', 6], 'right': ['117', 11], 'origin': ['117', 6], 'parent': ['117', 0], 'struct': 'Insert', 'content': [8633, 8634]})
          yield* this.store.tryExecute.call(this, {'id': ['119', 17], 'left': ['119', 2], 'right': ['119', 3], 'origin': ['119', 2], 'parent': ['117', 0], 'struct': 'Insert', 'content': [5921, 5922, 5923, 5924, 5925]})
          yield* this.store.tryExecute.call(this, {'id': ['117', 20], 'left': ['118', 1], 'right': null, 'origin': ['118', 1], 'parent': ['117', 0], 'struct': 'Insert', 'content': [9723]})
          yield* this.garbageCollectOperation(['117', 9])
          console.log('done1')
        })

        yield wait(100)

        expect(this.users[0].db.os.find(['117', 15]).next().value.deleted).toBeTruthy()
        done()
      }))
      it('Debug after implementing "content is an array" (4)', async(function * (done) {
        this.users[0].db.requestTransaction(function * () {
          yield* this.store.tryExecute.call(this, {'struct': 'List', 'id': ['174', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this, {'id': ['174', 1], 'left': null, 'right': null, 'origin': null, 'parent': ['_', 'Map_Map_root_'], 'struct': 'Insert', 'parentSub': 'Array', 'opContent': ['174', 0]})
          yield* this.store.tryExecute.call(this, {'struct': 'List', 'id': ['174', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this, {'id': ['174', 1], 'left': null, 'right': null, 'origin': null, 'parent': ['_', 'Map_Map_root_'], 'struct': 'Insert', 'parentSub': 'Array', 'opContent': ['174', 0]})
          yield* this.store.tryExecute.call(this, {'struct': 'List', 'id': ['174', 0], 'type': 'Array'})
        })
        yield wait(100)
        var array = yield this.users[0].share.root.get('Array')
        this.users[0].db.requestTransaction(function * () {
          yield* this.store.tryExecute.call(this, {'id': ['174', 1], 'left': null, 'right': null, 'origin': null, 'parent': ['_', 'Map_Map_root_'], 'struct': 'Insert', 'parentSub': 'Array', 'opContent': ['174', 0]})
          yield* this.store.tryExecute.call(this, {'left': null, 'origin': null, 'parent': ['174', 0], 'struct': 'Insert', 'content': [1789, 1790], 'id': ['175', 0], 'right': null})
          yield* this.store.tryExecute.call(this, {'start': null, 'end': null, 'struct': 'List', 'id': ['175', 2], 'type': 'Array'})
          yield* this.store.tryExecute.call(this, {'left': ['175', 1], 'origin': ['175', 1], 'parent': ['174', 0], 'struct': 'Insert', 'opContent': ['175', 2], 'id': ['175', 3], 'right': null})
          yield* this.store.tryExecute.call(this, {'left': null, 'origin': null, 'parent': ['175', 2], 'struct': 'Insert', 'content': [1, 2, 3, 4], 'id': ['175', 4], 'right': null})
          yield* this.store.tryExecute.call(this, {'left': ['175', 3], 'origin': ['175', 3], 'parent': ['174', 0], 'struct': 'Insert', 'content': [5779], 'id': ['175', 8], 'right': null})
          yield* this.store.tryExecute.call(this, {'target': ['175', 1], 'struct': 'Delete', 'length': 1})
          console.log('done1')
        })

        yield wait(100)
        expect(array._content.length).toEqual(3)
        done()
      }))
      it('Debug after implementing "content is an array" (5)', async(function * (done) {
        this.users[0].db.requestTransaction(function * () {
          yield* this.store.tryExecute.call(this, {'start': null, 'end': null, 'struct': 'List', 'id': ['15', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this, {'left': null, 'right': null, 'origin': null, 'parent': ['_', 'Map_Map_root_'], 'parentSub': 'Array', 'struct': 'Insert', 'opContent': ['15', 0], 'id': ['15', 1]})
          yield* this.store.tryExecute.call(this, {'start': null, 'end': null, 'struct': 'List', 'id': ['15', 2], 'type': 'Array'})
          yield* this.store.tryExecute.call(this, {'left': null, 'origin': null, 'parent': ['15', 0], 'struct': 'Insert', 'opContent': ['15', 2], 'id': ['15', 3], 'right': null})
          yield* this.store.tryExecute.call(this, {'left': null, 'origin': null, 'parent': ['15', 2], 'struct': 'Insert', 'content': [1, 2, 3, 4], 'id': ['15', 4], 'right': null})
          yield* this.store.tryExecute.call(this, {'left': null, 'origin': null, 'parent': ['15', 0], 'struct': 'Insert', 'content': [123, 124, 125], 'id': ['15', 8], 'right': ['15', 3]})
          yield* this.store.tryExecute.call(this, {'struct': 'List', 'id': ['17', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this, {'id': ['17', 1], 'left': ['15', 3], 'right': null, 'origin': ['15', 3], 'parent': ['15', 0], 'struct': 'Insert', 'opContent': ['17', 0]})
          yield* this.store.tryExecute.call(this, {'id': ['17', 2], 'left': null, 'right': null, 'origin': null, 'parent': ['17', 0], 'struct': 'Insert', 'content': [1, 2, 3, 4]})
          yield* this.store.tryExecute.call(this, {'id': ['15', 11], 'map': {}, 'struct': 'Map', 'type': 'Map'})
          yield* this.store.tryExecute.call(this, {'left': null, 'origin': null, 'parent': ['15', 0], 'struct': 'Insert', 'opContent': ['15', 11], 'id': ['15', 12], 'right': ['15', 8]})
          yield* this.store.tryExecute.call(this, {'left': null, 'right': null, 'origin': null, 'parent': ['15', 11], 'parentSub': 'someprop', 'struct': 'Insert', 'content': [42], 'id': ['15', 13]})
          yield* this.store.tryExecute.call(this, {'left': null, 'right': ['15', 13], 'origin': null, 'parent': ['15', 11], 'parentSub': 'someprop', 'struct': 'Insert', 'content': [43], 'id': ['15', 14]})
          yield* this.store.tryExecute.call(this, {'left': null, 'right': ['15', 14], 'origin': null, 'parent': ['15', 11], 'parentSub': 'someprop', 'struct': 'Insert', 'content': [44], 'id': ['15', 15]})
          yield* this.store.tryExecute.call(this, {'target': ['15', 12], 'struct': 'Delete', 'length': 1})
          yield* this.store.tryExecute.call(this, {'target': ['15', 8], 'struct': 'Delete', 'length': 1})
          yield* this.store.tryExecute.call(this, {'target': ['15', 3], 'struct': 'Delete', 'length': 1})
          yield* this.store.tryExecute.call(this, {'struct': 'List', 'id': ['17', 6], 'type': 'Array'})
          yield* this.store.tryExecute.call(this, {'struct': 'List', 'id': ['16', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this, {'struct': 'Map', 'type': 'Map', 'id': ['16', 6], 'map': {}})
          yield* this.store.tryExecute.call(this, {'target': ['16', 7], 'struct': 'Delete', 'length': 1})
          yield* this.store.tryExecute.call(this, {'id': ['17', 7], 'left': ['17', 1], 'right': null, 'origin': ['17', 1], 'parent': ['15', 0], 'struct': 'Insert', 'opContent': ['17', 6]})
          yield* this.store.tryExecute.call(this, {'id': ['17', 8], 'left': null, 'right': null, 'origin': null, 'parent': ['17', 6], 'struct': 'Insert', 'content': [1, 2, 3, 4]})
          yield* this.store.tryExecute.call(this, {'id': ['17', 12], 'left': null, 'right': ['15', 8], 'origin': null, 'parent': ['15', 0], 'struct': 'Insert', 'content': [6539]})
          yield* this.store.tryExecute.call(this, {'id': ['16', 11], 'left': ['15', 3], 'right': null, 'origin': ['15', 3], 'parent': ['15', 0], 'struct': 'Insert', 'content': [6056, 6057]})
          yield* this.store.tryExecute.call(this, {'id': ['16', 1], 'left': null, 'right': ['15', 3], 'origin': null, 'parent': ['15', 0], 'struct': 'Insert', 'opContent': ['16', 0]})
          yield* this.store.tryExecute.call(this, {'id': ['16', 2], 'left': null, 'right': null, 'origin': null, 'parent': ['16', 0], 'struct': 'Insert', 'content': [1, 2, 3, 4]})
          yield* this.store.tryExecute.call(this, {'id': ['16', 7], 'left': ['16', 1], 'right': ['15', 3], 'origin': ['16', 1], 'parent': ['15', 0], 'struct': 'Insert', 'opContent': ['16', 6]})
          yield* this.store.tryExecute.call(this, {'struct': 'Delete', 'target': ['16', 7]})
          yield* this.store.tryExecute.call(this, {'id': ['16', 8], 'left': null, 'right': null, 'origin': null, 'parent': ['16', 6], 'struct': 'Insert', 'parentSub': 'someprop', 'content': [42]})
          yield* this.store.tryExecute.call(this, {'id': ['16', 9], 'left': null, 'right': ['16', 8], 'origin': null, 'parent': ['16', 6], 'struct': 'Insert', 'parentSub': 'someprop', 'content': [43]})
          yield* this.store.tryExecute.call(this, {'id': ['16', 10], 'left': null, 'right': ['16', 9], 'origin': null, 'parent': ['16', 6], 'struct': 'Insert', 'parentSub': 'someprop', 'content': [44]})
          yield* this.garbageCollectOperation(['15', 13])
          yield* this.markGarbageCollected(['15', 13], 1)
          yield* this.garbageCollectOperation(['15', 15])
          yield* this.markGarbageCollected(['15', 15], 1)
          yield* this.garbageCollectOperation(['15', 14])
          yield* this.markGarbageCollected(['15', 14], 1)
          yield* this.garbageCollectOperation(['15', 4])
          yield* this.markGarbageCollected(['15', 4], 4)
          yield* this.garbageCollectOperation(['15', 3])
          yield* this.markGarbageCollected(['15', 3], 1)
          yield* this.garbageCollectOperation(['16', 8])
          yield* this.markGarbageCollected(['16', 8], 1)
          yield* this.garbageCollectOperation(['16', 10])
          yield* this.markGarbageCollected(['16', 10], 1)
          yield* this.garbageCollectOperation(['16', 9])
          yield* this.markGarbageCollected(['16', 9], 1)
          yield* this.garbageCollectOperation(['15', 2])
          yield* this.markGarbageCollected(['15', 2], 1)
          var isGCd = yield* this.isGarbageCollected(['15', 5])
          var o = yield* this.getInsertion(['15', 5])
          expect(o).toBeFalsy()
          expect(isGCd).toBeTruthy()
          console.log('done1')
        })
        yield wait(100)
        done()
      }))
      it('Debug after implementing "content is an array" (6)', async(function * (done) {
        this.users[0].db.requestTransaction(function * () {
          yield* this.store.tryExecute.call(this,  {'start': null, 'end': null, 'struct': 'List', 'id': ['42', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this,  {'left': null, 'right': null, 'origin': null, 'parent': ['_', 'Map_Map_root_'], 'parentSub': 'Array', 'struct': 'Insert', 'opContent': ['42', 0], 'id': ['42', 1]})
          yield* this.store.tryExecute.call(this,  {'left': null, 'origin': null, 'parent': ['42', 0], 'struct': 'Insert', 'content': [3673], 'id': ['42', 2], 'right': null})
          yield* this.store.tryExecute.call(this,  {'left': ['42', 2], 'origin': ['42', 2], 'parent': ['42', 0], 'struct': 'Insert', 'content': [3648], 'id': ['42', 3], 'right': null})
          yield* this.store.tryExecute.call(this,  {'target': ['42', 3], 'struct': 'Delete', 'length': 1})
        })
        this.users[1].db.requestTransaction(function * () {
          yield* this.store.tryExecute.call(this,  {'struct': 'List', 'id': ['42', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this,  {'id': ['42', 1], 'left': null, 'right': null, 'origin': null, 'parent': ['_', 'Map_Map_root_'], 'struct': 'Insert', 'parentSub': 'Array', 'opContent': ['42', 0]})
          yield* this.store.tryExecute.call(this,  {'struct': 'List', 'id': ['42', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this,  {'id': ['42', 1], 'left': null, 'right': null, 'origin': null, 'parent': ['_', 'Map_Map_root_'], 'struct': 'Insert', 'parentSub': 'Array', 'opContent': ['42', 0]})
          yield* this.store.tryExecute.call(this,  {'struct': 'List', 'id': ['42', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this,  {'id': ['42', 1], 'left': null, 'right': null, 'origin': null, 'parent': ['_', 'Map_Map_root_'], 'struct': 'Insert', 'parentSub': 'Array', 'opContent': ['42', 0]})
          yield* this.store.tryExecute.call(this,  {'id': ['42', 2], 'left': null, 'right': null, 'origin': null, 'parent': ['42', 0], 'struct': 'Insert', 'content': [3673]})
          yield* this.store.tryExecute.call(this,  {'id': ['42', 2], 'left': null, 'right': null, 'origin': null, 'parent': ['42', 0], 'struct': 'Insert', 'content': [3673, 3648]})
          yield* this.store.tryExecute.call(this,  {'target': ['42', 3], 'struct': 'Delete', 'length': 1})
        })
        yield wait(100)
        yield compareAllUsers([this.users[0], this.users[1]])
        done()
      }))
      it('Debug after implementing "content is an array" (7)', async(function * (done) {
        this.users[0].db.requestTransaction(function * () {
          yield* this.store.tryExecute.call(this,  {'start': null, 'end': null, 'struct': 'List', 'id': ['45', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this,  {'left': null, 'right': null, 'origin': null, 'parent': ['_', 'Map_Map_root_'], 'parentSub': 'Array', 'struct': 'Insert', 'opContent': ['45', 0], 'id': ['45', 1]})
          yield* this.store.tryExecute.call(this,  {'id': ['46', 0], 'left': null, 'right': null, 'origin': null, 'parent': ['45', 0], 'struct': 'Insert', 'content': [6481]})
          yield* this.store.tryExecute.call(this,  {'target': ['46', 0], 'struct': 'Delete', 'length': 1})
          yield* this.store.tryExecute.call(this,  {'left': null, 'origin': null, 'parent': ['45', 0], 'struct': 'Insert', 'content': [6093], 'id': ['45', 2], 'right': ['46', 0]})
          yield* this.store.tryExecute.call(this,  {'left': ['45', 2], 'origin': ['45', 2], 'parent': ['45', 0], 'struct': 'Insert', 'content': [3381], 'id': ['45', 3], 'right': ['46', 0]})
          yield* this.store.tryExecute.call(this,  {'left': ['45', 3], 'origin': ['45', 3], 'parent': ['45', 0], 'struct': 'Insert', 'content': [4896], 'id': ['45', 4], 'right': ['46', 0]})
          yield* this.store.tryExecute.call(this,  {'left': null, 'origin': null, 'parent': ['45', 0], 'struct': 'Insert', 'content': [5302], 'id': ['45', 5], 'right': ['45', 2]})
          yield* this.store.tryExecute.call(this,  {'id': ['47', 0], 'left': ['45', 3], 'right': ['46', 0], 'origin': null, 'parent': ['45', 0], 'struct': 'Insert', 'content': [3842]})
          yield* this.store.tryExecute.call(this,  {'struct': 'Delete', 'target': ['47', 0]})
          yield* this.garbageCollectOperation(['46', 0])
        })
        this.users[1].db.requestTransaction(function * () {
          yield* this.store.tryExecute.call(this,  {'struct': 'List', 'id': ['45', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this,  {'id': ['45', 1], 'left': null, 'right': null, 'origin': null, 'parent': ['_', 'Map_Map_root_'], 'struct': 'Insert', 'parentSub': 'Array', 'opContent': ['45', 0]})
          yield* this.store.tryExecute.call(this,  {'struct': 'List', 'id': ['45', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this,  {'id': ['45', 1], 'left': null, 'right': null, 'origin': null, 'parent': ['_', 'Map_Map_root_'], 'struct': 'Insert', 'parentSub': 'Array', 'opContent': ['45', 0]})
          yield* this.store.tryExecute.call(this,  {'struct': 'List', 'id': ['45', 0], 'type': 'Array'})
          yield* this.store.tryExecute.call(this,  {'id': ['45', 1], 'left': null, 'right': null, 'origin': null, 'parent': ['_', 'Map_Map_root_'], 'struct': 'Insert', 'parentSub': 'Array', 'opContent': ['45', 0]})
          yield* this.store.tryExecute.call(this,  {'left': null, 'origin': null, 'parent': ['45', 0], 'struct': 'Insert', 'content': [6481], 'id': ['46', 0], 'right': null})
          yield* this.store.tryExecute.call(this,  {'id': ['47', 0], 'left': null, 'right': ['46', 0], 'origin': null, 'parent': ['45', 0], 'struct': 'Insert', 'content': [3842]})
          yield* this.store.tryExecute.call(this,  {'target': ['46', 0], 'struct': 'Delete', 'length': 1})
          yield* this.store.tryExecute.call(this,  {'id': ['45', 2], 'left': null, 'right': ['46', 0], 'origin': null, 'parent': ['45', 0], 'struct': 'Insert', 'content': [6093]})
          yield* this.store.tryExecute.call(this,  {'target': ['47', 0], 'struct': 'Delete', 'length': 1})
          yield* this.store.tryExecute.call(this,  {'id': ['45', 3], 'left': ['45', 2], 'right': ['46', 0], 'origin': ['45', 2], 'parent': ['45', 0], 'struct': 'Insert', 'content': [3381]})
          yield* this.store.tryExecute.call(this,  {'id': ['45', 5], 'left': null, 'right': ['45', 2], 'origin': null, 'parent': ['45', 0], 'struct': 'Insert', 'content': [5302]})
          yield* this.store.tryExecute.call(this,  {'id': ['45', 4], 'left': ['45', 3], 'right': ['47', 0], 'origin': ['45', 3], 'parent': ['45', 0], 'struct': 'Insert', 'content': [4896]})
          yield* this.garbageCollectOperation(['46', 0])
        })
        yield wait(100)
        yield compareAllUsers([this.users[0], this.users[1]])
        done()
      }))
      it('Debug after implementing "content is an array" (8)', async(function * (done) {
        this.users[0].db.requestTransaction(function * () {

        })
        this.users[1].db.requestTransaction(function * () {

        })
        yield wait(100)
        debugger
        yield compareAllUsers([this.users[0], this.users[1]])
        done()
      }))
    })
    describeManyTimes(repeatArrayTests, `Random tests`, function () {
      var randomArrayTransactions = [
        function insert (array) {
          var c = getRandomNumber()
          var content = []
          var len = 1 // getRandomNumber(4) TODO!!
          for (var i = 0; i < len; i++) {
            content.push(c + i)
          }
          array.insert(getRandomNumber(array.toArray().length + 1), content)
        },
        /*
        function insertTypeArray (array) {
          var pos = getRandomNumber(array.toArray().length + 1)
          array.insert(pos, [Y.Array])
          array.get(pos).then(function (array) {
            array.insert(0, [1, 2, 3, 4])
          })
        },
        function insertTypeMap (array) {
          var pos = getRandomNumber(array.toArray().length + 1)
          array.insert(pos, [Y.Map])
          array.get(pos).then(function (map) {
            map.set('someprop', 42)
            map.set('someprop', 43)
            map.set('someprop', 44)
          })
        },*/ // TODO!!
        function _delete (array) {
          var length = array._content.length
          if (length > 0) {
            var pos = getRandomNumber(length)
            if (array._content[pos].type != null) {
              if (getRandomNumber(2) === 1) {
                array.get(pos).then(function (type) {
                  if (type instanceof Y.Array.typeDefinition.class) {
                    if (type._content.length > 0) {
                      var pos = getRandomNumber(type._content.length)
                      type.delete(pos)
                    }
                  } else {
                    type.delete('someprop')
                  }
                })
              } else {
                array.delete(pos)
              }
            } else {
              array.delete(pos)
            }
          }
        }
      ]
      function compareArrayValues (arrays) {
        var firstArray
        for (var l of arrays) {
          var val = l.toArray()
          if (firstArray == null) {
            firstArray = val
          } else {
            expect(val).toEqual(firstArray)
          }
        }
      }
      beforeEach(async(function * (done) {
        yield this.users[0].share.root.set('Array', Y.Array)
        yield flushAll()

        var promises = []
        for (var u = 0; u < this.users.length; u++) {
          promises.push(this.users[u].share.root.get('Array'))
        }
        this.arrays = yield Promise.all(promises)
        done()
      }))
      it('arrays.length equals users.length', async(function * (done) {
        expect(this.arrays.length).toEqual(this.users.length)
        done()
      }))
      it(`succeed after ${numberOfYArrayTests} actions, no GC, no disconnect`, async(function * (done) {
        yield applyRandomTransactionsNoGCNoDisconnect(this.users, this.arrays, randomArrayTransactions, numberOfYArrayTests)
        yield flushAll()
        yield compareArrayValues(this.arrays)
        yield compareAllUsers(this.users)
        done()
      }))
      it(`succeed after ${numberOfYArrayTests} actions, no GC, all users disconnecting/reconnecting`, async(function * (done) {
        yield applyRandomTransactionsAllRejoinNoGC(this.users, this.arrays, randomArrayTransactions, numberOfYArrayTests)
        yield flushAll()
        yield compareArrayValues(this.arrays)
        yield compareAllUsers(this.users)
        done()
      }))
      it(`succeed after ${numberOfYArrayTests} actions, GC, user[0] is not disconnecting`, async(function * (done) {
        yield applyRandomTransactionsWithGC(this.users, this.arrays, randomArrayTransactions, numberOfYArrayTests)
        yield flushAll()
        yield compareArrayValues(this.arrays)
        yield compareAllUsers(this.users)
        done()
      }))
    })
  })
}
