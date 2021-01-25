const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require("worker_threads");

const min = 2;
let primes = [];

// 소수를 판별하는 함수
function findPrimes(start, range) {
  let isPrime = true;
  let end = start + range;
  for (let i = start; i < end; i++) {
    for (let j = min; j < Math.sqrt(end); j++) {
      if (i !== j && i % j === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) {
      primes.push(i);
    }
    isPrime = true;
  }
}

if (isMainThread) {
  const max = 10000000;

  // worker 8개 돌릴겁니다.
  const threadCount = 8;
  const threads = new Set(); // Set 자료구조

  const range = Math.ceil((max - min) / threadCount);
  let start = min;
  console.time("prime");

  // 각 worker 에게 workerData로 처리할 범위만큼만 전달합니다.
  for (let i = 0; i < threadCount - 1; i++) {
    const wStart = start;
    threads.add(
      new Worker(__filename, { workerData: { start: wStart, range } })
    );
    start += range;
  }

  // 마지막 worker에는 남는 값을 전달합니다.
  threads.add(
    new Worker(__filename, {
      workerData: { start, range: range + ((max - min + 1) % threadCount) },
    })
  );

  // Set에 담긴 각 worker에게
  for (let worker of threads) {
    worker.on("error", (err) => {
      throw err;
    });
    worker.on("exit", () => {
      // worker가 종료될 때마다 set에서 worker를 1개씩 지워줍니다.
      threads.delete(worker);

      // set에 남아있는 worker가 없다면 측정을 종료하고 primes 배열의 length를 출력합니다.
      if (threads.size === 0) {
        console.timeEnd("prime");
        console.log(primes.length);
      }
    });

    // worker가 보낸 값을 concat 합니다. (배열이니까요)
    worker.on("message", (msg) => {
      primes = primes.concat(msg);
    });
  }
} else {
  // worker는 findPrimes 함수를 실행합니다.
  findPrimes(workerData.start, workerData.range);
  parentPort.postMessage(primes);
}
