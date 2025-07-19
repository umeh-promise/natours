const fs = require('fs');

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
);

exports.getAllTours = (req, res) => {
  res.status(200).json({
    status: 'success',
    requestedTime: req.requestTime,
    data: {
      tours,
      total: tours.length,
    },
  });
};

exports.getTour = (req, res) => {
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

exports.createTour = (req, res) => {
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

exports.updateTour = (req, res) => {
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

exports.deleteTour = (req, res) => {
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
