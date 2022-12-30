import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as pactum from 'pactum';
import { AppModule } from '../server/app.module';
import { AuthDto } from '../server/auth/dto/auth.dto';
import { CreateBookmarkDto, EditBookmarkDto } from '../server/bookmark/dto';
import { PrismaService } from '../server/prisma/prisma.service';
import { EditUserDto } from '../server/user/dto';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      }),
    );
    await app.init();
    await app.listen(3333);

    prisma = app.get(PrismaService);
    await prisma.cleanDb();
    pactum.request.setBaseUrl('http://localhost:3333');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth', () => {
    const dto: AuthDto = {
      email: 'guy@gmail.com',
      password: '123',
    };

    describe('Signup', () => {
      it('should throw exception if email was not provided', async () => {
        return await pactum
          .spec()
          .post('/auth/signup')
          .withBody({ password: dto.password })
          .expectStatus(400)
          .expectBodyContains('email should not be empty');
      });

      it('should throw exception if invalid email was provided', async () => {
        return await pactum
          .spec()
          .post('/auth/signup')
          .withBody({ email: 'test', password: dto.password })
          .expectStatus(400)
          .expectBodyContains('email must be an email');
      });

      it('should throw exception if password was not provided', async () => {
        return await pactum
          .spec()
          .post('/auth/signup')
          .withBody({ email: dto.email })
          .expectStatus(400)
          .expectBodyContains('password should not be empty');
      });

      it('should throw exception if invalid password was provided', async () => {
        return await pactum
          .spec()
          .post('/auth/signup')
          .withBody({ email: dto.email, password: 123 })
          .expectStatus(400)
          .expectBodyContains('password must be a string');
      });

      it('should throw exception if body was not provided', async () => {
        return await pactum.spec().post('/auth/signup').expectStatus(400);
      });

      it('should create a user', async () => {
        return await pactum.spec().post('/auth/signup').withBody(dto).expectStatus(201);
      });
    });

    describe('Signin', () => {
      it('should throw exception if email was not provided', async () => {
        return await pactum
          .spec()
          .post('/auth/signin')
          .withBody({ password: dto.password })
          .expectStatus(400)
          .expectBodyContains('email should not be empty');
      });

      it('should throw exception if invalid email was provided', async () => {
        return await pactum
          .spec()
          .post('/auth/signin')
          .withBody({ email: 'test', password: dto.password })
          .expectStatus(400)
          .expectBodyContains('email must be an email');
      });

      it('should throw exception if password was not provided', async () => {
        return await pactum
          .spec()
          .post('/auth/signin')
          .withBody({ email: dto.email })
          .expectStatus(400)
          .expectBodyContains('password should not be empty');
      });

      it('should throw exception if invalid password was provided', async () => {
        return await pactum
          .spec()
          .post('/auth/signin')
          .withBody({ email: dto.email, password: 123 })
          .expectStatus(400)
          .expectBodyContains('password must be a string');
      });

      it('should throw exception if body was not provided', async () => {
        return await pactum.spec().post('/auth/signin').expectStatus(400);
      });

      it('should login a user', async () => {
        return await pactum
          .spec()
          .post('/auth/signin')
          .withBody(dto)
          .expectStatus(200)
          .stores('userAt', 'access_token');
      });
    });
  });

  describe('User', () => {
    describe('Get me', () => {
      it('should throw exception if no token was provided', async () => {
        return await pactum.spec().get('/user/me').expectStatus(401);
      });

      it('should get the current user', async () => {
        return await pactum
          .spec()
          .get('/user/me')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .expectStatus(200);
      });
    });

    describe('Edit user', () => {
      const dto: EditUserDto = {
        email: 'guyjof@gmail.com',
        firstName: 'Guy',
      };

      it('should update the current user', async () => {
        return await pactum
          .spec()
          .patch('/user')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .withBody(dto)
          .expectStatus(200)
          .expectBodyContains(dto.email)
          .expectBodyContains(dto.firstName);
      });
    });
  });

  describe('Bookmarks', () => {
    describe('Get empty bookmarks', () => {
      it('should get empty bookmarks', async () => {
        return await pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .expectStatus(200)
          .expectBodyContains([]);
      });
    });

    describe('Create bookmark', () => {
      const dto: CreateBookmarkDto = {
        title: 'chatGPT',
        link: 'https://chat.openai.com/chat',
      };

      it('should create bookmark', async () => {
        return await pactum
          .spec()
          .post('/bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .withBody(dto)
          .expectStatus(201)
          .expectBodyContains(dto.title)
          .expectBodyContains(dto.link)
          .stores('bookmarkId', 'id');
      });
    });

    describe('Get bookmarks', () => {
      it('should get bookmarks', async () => {
        return await pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .expectStatus(200)
          .expectJsonLength(1);
      });
    });

    describe('Get bookmark by id', () => {
      it('should get bookmark by id', async () => {
        return await pactum
          .spec()
          .get('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .expectStatus(200)
          .expectBodyContains('$S{bookmarkId}')
          .expectBodyContains('chatGPT')
          .expectBodyContains('https://chat.openai.com/chat');
      });
    });

    describe('Edit bookmark by id', () => {
      const dto: EditBookmarkDto = {
        description: 'GPT-3 powered chat',
      };

      it('should throw exception if bookmark cant be accessed', async () => {
        return await pactum
          .spec()
          .delete('/bookmarks/1234')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .expectStatus(403);
      });

      it('should edit bookmark by id', async () => {
        return await pactum
          .spec()
          .patch('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withBody(dto)
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .expectStatus(200)
          .expectBodyContains('$S{bookmarkId}')
          .expectBodyContains('chatGPT')
          .expectBodyContains('https://chat.openai.com/chat')
          .expectBodyContains(dto.description);
      });
    });

    describe('Delete bookmark by id', () => {
      it('should throw exception if bookmark cant be accessed', async () => {
        return await pactum
          .spec()
          .delete('/bookmarks/1234')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .expectStatus(403);
      });

      it('should delete bookmark by id', async () => {
        return await pactum
          .spec()
          .delete('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .expectStatus(204);
      });

      it('should get empty bookmarks', async () => {
        return await pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .expectStatus(200)
          .expectBodyContains([]);
      });
    });
  });
});
