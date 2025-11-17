/**
 * Calculates the squared Euclidean distance between two vectors.
 * @param a The first vector.
 * @param b The second vector.
 * @returns The squared Euclidean distance.
 */
const squaredDistance = (a: number[], b: number[]): number => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return sum;
};

/**
 * Initializes centroids by picking k random data points.
 * @param data The dataset of vectors.
 * @param k The number of clusters.
 * @returns An array of k centroid vectors.
 */
const initializeCentroids = (data: number[][], k: number): number[][] => {
  const centroids: number[][] = [];
  const usedIndices = new Set<number>();
  while (centroids.length < k && centroids.length < data.length) {
    const index = Math.floor(Math.random() * data.length);
    if (!usedIndices.has(index)) {
      centroids.push(data[index]);
      usedIndices.add(index);
    }
  }
  return centroids;
};

/**
 * Simple K-Means clustering algorithm implementation.
 * @param data An array of data points (vectors).
 * @param k The number of clusters to form.
 * @param maxIterations The maximum number of iterations to run.
 * @returns An object containing the final cluster assignments and centroids.
 */
export const kmeans = (data: number[][], k: number, maxIterations = 50) => {
  if (data.length === 0 || k === 0) {
    return { assignments: [], centroids: [] };
  }

  // 1. Initialize centroids
  let centroids = initializeCentroids(data, k);
  let assignments = new Array(data.length).fill(0);
  let changed = true;

  for (let iter = 0; iter < maxIterations && changed; iter++) {
    changed = false;

    // 2. Assign each point to the nearest centroid
    for (let i = 0; i < data.length; i++) {
      let minDistance = Infinity;
      let closestCentroid = 0;
      for (let j = 0; j < centroids.length; j++) {
        const distance = squaredDistance(data[i], centroids[j]);
        if (distance < minDistance) {
          minDistance = distance;
          closestCentroid = j;
        }
      }
      if (assignments[i] !== closestCentroid) {
        assignments[i] = closestCentroid;
        changed = true;
      }
    }

    // 3. Recalculate centroids
    const newCentroids: number[][] = Array.from({ length: k }, () => new Array(data[0].length).fill(0));
    const counts = new Array(k).fill(0);

    for (let i = 0; i < data.length; i++) {
      const clusterIndex = assignments[i];
      counts[clusterIndex]++;
      for (let d = 0; d < data[i].length; d++) {
        newCentroids[clusterIndex][d] += data[i][d];
      }
    }

    for (let i = 0; i < k; i++) {
      if (counts[i] > 0) {
        for (let d = 0; d < newCentroids[i].length; d++) {
          newCentroids[i][d] /= counts[i];
        }
      } else {
        // If a cluster becomes empty, re-initialize its centroid
        newCentroids[i] = data[Math.floor(Math.random() * data.length)];
      }
    }
    centroids = newCentroids;
  }

  return { assignments, centroids };
};
