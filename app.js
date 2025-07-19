const fs = require('fs');
const express = require('express');
const morgan = require('morgan');

const app = express();
app.use(morgan('dev'));
app.use(express.json());
app.use((req, res, next) => {
  console.log('hello from my custom middleware');
  next();
});

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// app.get('/', (req, res) => {
//   res
//     .status(200)
//     .json({ status: 'success', message: 'Hello from the server side' });
// });

// app.post('/', (req, res) => {
//   res.send('You can post to this endpoint');
// });

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/dev-data/data/tours-simple.json`)
);

const getAllTours = (req, res) => {
  res.status(200).json({
    status: 'success',
    requestedTime: req.requestTime,
    data: {
      tours,
      total: tours.length,
    },
  });
};

const getTour = (req, res) => {
  const tour_id = Number(req.params.id);
  const tour = tours.find((tour) => tour.id === tour_id);
  if (!tour)
    return res.status(404).json({
      status: 'fail',
      message: 'Tour not found',
    });

  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });
};

const createTour = (req, res) => {
  const new_id = tours[tours.length - 1].id + 1;
  const new_tour = Object.assign({ id: new_id }, req.body);
  tours.push(new_tour);
  fs.writeFile(
    `${__dirname}/dev-data/data/tours-simple.json`,
    JSON.stringify(tours),
    (err) => {
      if (err)
        return res
          .status(400)
          .send({ status: 'fail', message: 'Validation error' });

      res.status(201).send({
        status: 'success',
        data: {
          tour: new_tour,
        },
      });
    }
  );
};

const updateTour = (req, res) => {
  const tour_id = Number(req.params.id);

  if (tour_id > tours.length)
    return res.status(404).json({
      status: 'fail',
      message: 'Tour not found',
    });

  const updated_tour = tours[tour_id];
  updated_tour.name = req.body.name;
  updated_tour.duration = req.body.duration;
  updated_tour.difficulty = req.body.difficulty;

  tours.push(updated_tour);
  res.status(200).json({
    status: 'success',
    data: {
      updated_tour,
    },
  });
};

const deleteTour = (req, res) => {
  const tour_id = Number(req.params.id);
  if (tour_id > tours.length)
    return res.status(404).json({
      status: 'fail',
      message: 'Tour not found',
    });

  const updated_tours = tours.filter((tour) => tour.id !== tour_id);

  tours.push(updated_tours);
  res.status(204).json({
    status: 'success',
    message: 'Tour deleted',
  });
};

const getAllUsers = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined',
  });
};
const getUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined',
  });
};
const createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined',
  });
};
const updateUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined',
  });
};
const deleteUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined',
  });
};

// ROUTES
const tourRouter = express.Router();
tourRouter.route('/').get(getAllTours).post(createTour);
tourRouter.route('/:id').get(getTour).patch(updateTour).delete(deleteTour);

const userRouter = express.Router();
userRouter.route('/').get(getAllUsers).post(createUser);
userRouter.route('/:id').get(getUser).patch(updateUser).delete(deleteUser);

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

const port = 3005;
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
