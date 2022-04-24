import { EventEmitter, BroadcastChannelEventEmitter } from './EventEmitter';

// import { test } from "jest-circus";
// const BroadcastChannelEventEmitter = require('./EventEmitter');

test('Hello there did this work?', () => {
    expect(1).toBe(1);
});

// test('Setup EventEmitter', () => {
//     const em = new EventEmitter();
//     expect(em.forTest()).toBe("Test!");
// });

test('some other', () => {
    const bcem = new BroadcastChannelEventEmitter('');
});