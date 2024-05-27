## 개요

![e-learning drawio](https://github.com/oswaldeff/e-learning/assets/66583879/1b0645a0-e050-4168-84b3-90c0e56e29d3)

1. 다수의 모듈과 멀티 인스턴스 환경을 고려하여, API request시 인증 및 인가를 Edge로 적용시키는 상황을 생각해보았습니다.
2. Header를 통해 식별값을 받는다는 요구사항으로부터 API Gateway와 Auth Server(Lambda혹은 별도의 Micro Service)를 거쳐 User Passport가 전달되는 상황을 가정할 수 있다고 생각했습니다.
3. 헤더로부터 전달받은 정보는 payload가 노출되지 않도록 암호화되어있으며 무결성을 보장할 수 있어야한다고 생각하여, HMAC암호화 방식을 통해 encode된 정보라고 추가적으로 가정하였습니다.
4. 클라이언트의 Request로부터 Lecture Service로 이벤트가 전달되면 User Passport에서 사용자 정보를 전달받아 강의장 개설, 강의장 참석, 강의장 조회의 기능이 사용될 수 있도록 nest.js로 구현하였습니다.
5. 서비스 간의 의존도를 낮추고 조회 성능을 향상시키기 위하여, CQRS패턴으로부터 데이터 변경모델과 데이터 조회모델의 인터페이스를 분리하는 것을 처음엔 가정하였지만 Code Level에서는 반영하지 못하였습니다.
6. 멀티 인스턴스 환경에서 강의장 참석기능을 구현하기 위해 데이터베이스 락 대신에 redis락을 활용하였습니다.

## 프로젝트 구조

```bash
.
├── README.md
├── .eslintrc.json
├── .prettierrc
├── .nest-cli.json
├── tsconfig.build.json
├── tsconfig.json
├── package-lock.json
├── package.json
├── test
├── src
│   ├── auth # Lambda 혹은 별도의 Micro service로 동작함을 가정
│   │   ├── dto
│   │   ├── guard
│   │   ├── interface
│   │   ├── passport
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── jwt-config.service.ts
│   ├── lecture # 강의장 Micro Service
│   │   ├── dto
│   │   ├── entity
│   │   ├── lecture.module.ts
│   │   ├── lecture.controller.ts
│   │   ├── lecture.service.ts
│   ├── common
│   │   ├── decorator
│   │   ├── dto
│   │   ├── entity
│   │   ├── interceptor
│   ├── config
│   │   ├── env
│   │   │   ├── .dev.env
│   │   │   ├── .prod.env
│   │   │   ├── sample.env
│   ├── app.module.ts
│   ├── main.ts
```

## 버전 정보

node version: v21  
project version: v0.1
swagger version: OAS 3.0

## 설치

```bash
$ npm install
```

## 실행

sample.env 구성 참조

```bash
# development mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## 스웨거

http://localhost:3000/swagger/docs

## ERD

<img width="300" alt="e-learning-erd" src="https://github.com/oswaldeff/e-learning/assets/66583879/408b969b-e905-462f-a858-fccf6e1eee38">

1. Lecture테이블은 강의 개설 이벤트 발생시 생성되며, 최대참석가능 수강생 설정인원값과 강의 참석시 활용될 수 있는 강의코드, 강사ID와 강의상태를 표시할 수 있도록 데이터 필드에 반영하였습니다.
2. Attend테이블은 강의 참석 이벤트 발생시 생성되며, 무결성을 보장하기 위해 정규화를 적용하여 참석 학생ID 및 연결된 강의ID를 데이터 필드에 반영하였습니다.

## 구현

### 강의장 개설

1. lecture 컨트롤러에서 서비스 레이어의 decodeUserHeader메서드를 통해 X-USER-ID헤더를 decode하도록 Single Responsibility를 적용하였습니다.
2. createLecture메서드는 transactionManager를 통해 강의개설에 대한 트랜잭션 commit과 rollback을 관리하고, redis를 통해 최대참석가능 수강생 인원값을 설정합니다.
3. 한명의 강사만이 한개의 강의를 개설할 수 있으므로, 동시다발적인 요청은 배제하여 강의개설rollback의 경우 redis데이터에 대한 보상을 적용하였습니다.
4. lecture데이터가 생성될 시, 강의참여코드에 대한 UUID값을 응답합니다.

### 강의장 종료

1. lecture 컨트롤러에서 각각 decodeUserHeader메서드와 decodeRoomHeader메서드를 통해 X-USER-ID헤더와 X-ROOM-ID헤더를 decode하고 userId, role, lectureId를 넘겨줍니다.
2. findOne ORM조건을 통해 본인개설 확인여부를 검증하고, deleteLecture메서드를 통해 lecture데이터와 lecture capacity데이터를 삭제합니다.

### 강의장 참석

1. lecture 컨트롤러에서 attendLecture메서드가 실행되는 경우, 존재하는 lecture데이터에 대하여 분산락을 구현 및 적용해보았습니다.
2. nest.js에서는 java의 redisson에 호환되는 라이브러리가 존재하지 않아, 클러스터구조가 아닌 단일 리소스에 대한 ttl, retry등을 설정하여 pub/sub을 통해 락 획득 및 락 해제를 구현해보았습니다.
3. 락 획득시(acquireLock), 잠금키에 대한 잠금 토큰을 생성하고 최대 재시도 횟수까지 잠금을 획득하도록 하였습니다.
4. 잠금이 성공적으로 획득된 경우 true를 반환하여 attendLecture메서드의 다음 단계가 실행되도록 했습니다.
5. 만일 잠금이 실패하는 경우 잠금 토큰에 대한 구독 이벤트를 통해 잠금 획득 실패에 대한 처리를 적용하였습니다.
6. 락 해제시(releaseLock), Lua 스크립트를 사용하여 잠금 해제를 적용하였으며, attendLecture메서드에서 finally문을 통해 해제가 보장되도록 했습니다.
7. 현재 구현된 코드에서는 락이 걸려있는동안 발생한 요청을 실패처리 하도록 되어있는데, redis queue자료구조를 통해 요청에 대한 이벤트를 저장하고 락 해제시 순차적 처리를 보장해야하는 부분은 코드에 반영하지 못했습니다.

### 강의장 조회

1. lecture 컨트롤러에서 getLectureInformations메서드가 실행되는 경우 createQueryBuilder를 통해 left조인을 수행해주고 lecture정보와 attend정보를 응답하도록 했습니다.
2. lecture엔티티 설계시, status값을 enum타입으로 설정함으로서 강의 종료외의 상태에 대응할 수 있도록 했습니다.
