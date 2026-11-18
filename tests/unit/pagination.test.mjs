// Unit tests for pagination math & windowing logic
import { test } from 'node:test';
import assert from 'node:assert/strict';

function computePaginationPages(currentPage, totalPages) {
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }

  pages.push(1);
  const leftBoundary = Math.max(2, currentPage - 1);
  const rightBoundary = Math.min(totalPages - 1, currentPage + 1);

  if (leftBoundary > 2) pages.push('ellipsis-left');
  for (let i = leftBoundary; i <= rightBoundary; i++) pages.push(i);
  if (rightBoundary < totalPages - 1) pages.push('ellipsis-right');
  pages.push(totalPages);

  return pages;
}

test('computePaginationPages returns all pages when totalPages <= 7', () => {
  assert.deepEqual(computePaginationPages(1, 4), [1, 2, 3, 4]);
  assert.deepEqual(computePaginationPages(3, 5), [1, 2, 3, 4, 5]);
});

test('computePaginationPages generates smart ellipses for large totalPages', () => {
  // Page 1 of 10 -> [1, 2, 'ellipsis-right', 10]
  const p1 = computePaginationPages(1, 10);
  assert.equal(p1[0], 1);
  assert.equal(p1[p1.length - 1], 10);
  assert.ok(p1.includes('ellipsis-right'));

  // Page 5 of 10 -> [1, 'ellipsis-left', 4, 5, 6, 'ellipsis-right', 10]
  const p5 = computePaginationPages(5, 10);
  assert.deepEqual(p5, [1, 'ellipsis-left', 4, 5, 6, 'ellipsis-right', 10]);
});

test('page slicing calculates correct start and end items for 33 properties', () => {
  const total = 33;
  const pageSize = 9;
  const totalPages = Math.ceil(total / pageSize); // 4 pages

  assert.equal(totalPages, 4);

  // Page 1: 0 to 9 (items 1 - 9)
  const p1Start = (1 - 1) * pageSize;
  const p1End = p1Start + pageSize;
  assert.equal(p1Start, 0);
  assert.equal(p1End, 9);

  // Page 4: 27 to 36 (items 28 - 33)
  const p4Start = (4 - 1) * pageSize;
  const p4End = Math.min(p4Start + pageSize, total);
  assert.equal(p4Start, 27);
  assert.equal(p4End, 33);
  assert.equal(p4End - p4Start, 6); // exactly 6 items on last page
});
