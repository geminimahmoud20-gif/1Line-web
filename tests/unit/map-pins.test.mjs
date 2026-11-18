import test from 'node:test';
import assert from 'node:assert/strict';
import { pinPriceLabel, locationQuality, mapLayout, inBounds, escapeHtml } from '../../src/utils/mapPins.js';

const centers = { new_sohag: { lat: 26.48, lng: 31.80 }, east: { lat: 26.56, lng: 31.70 } };
const centerOf = (k) => centers[k] || null;

test('pin price reads in millions or thousands', () => {
  assert.equal(pinPriceLabel(1_850_000), '1.9 مليون');
  assert.equal(pinPriceLabel(850_000), '850 ألف');
  assert.equal(pinPriceLabel(0), 'اسأل عن السعر');
  assert.equal(pinPriceLabel(2_000_000, false), '2M');
});

test('only a spot set on the map counts as exact', () => {
  assert.equal(locationQuality({ locationExact: true, coordinates: { lat: 26.5, lng: 31.7 } }), 'exact');
  assert.equal(locationQuality({ coordinates: { lat: 26.5, lng: 31.7 }, areaKey: 'east' }), 'area');
  assert.equal(locationQuality({ locationExact: true, coordinates: { lat: 0, lng: 0 }, areaKey: 'east' }), 'area');
  assert.equal(locationQuality({}), 'none');
});

test('mapLayout: exact pins, one bubble per area, unplaced count', () => {
  const list = [
    { id: 'a', locationExact: true, coordinates: { lat: 26.5, lng: 31.7 }, price: 1 },
    { id: 'b', areaKey: 'new_sohag', price: 2_000_000 },
    { id: 'c', areaKey: 'new_sohag', price: 900_000 },
    { id: 'd', areaKey: 'new_sohag', price: 0 },
    { id: 'e', areaKey: 'east', price: 3_000_000 },
    { id: 'f', areaKey: 'unknown_area' },
    { id: 'g' }
  ];
  const { pins, bubbles, unplaced } = mapLayout(list, centerOf);
  assert.deepEqual(pins.map((p) => p.id), ['a']);
  assert.deepEqual(bubbles.map((b) => [b.areaKey, b.count, b.minPrice]), [['new_sohag', 3, 900_000], ['east', 1, 3_000_000]]);
  assert.equal(unplaced, 2);
});

test('inBounds uses the exact spot or the area centre', () => {
  const box = { south: 26.4, north: 26.5, west: 31.75, east: 31.85 };
  assert.equal(inBounds({ areaKey: 'new_sohag' }, box, centerOf), true);
  assert.equal(inBounds({ areaKey: 'east' }, box, centerOf), false);
  assert.equal(inBounds({ locationExact: true, coordinates: { lat: 26.45, lng: 31.8 } }, box, centerOf), true);
  assert.equal(inBounds({ id: 'x' }, null, centerOf), true);
});

test('escapeHtml neutralises markup in titles', () => {
  assert.equal(escapeHtml('<img src=x onerror=1> "شقة"'), '&lt;img src=x onerror=1&gt; &quot;شقة&quot;');
});
