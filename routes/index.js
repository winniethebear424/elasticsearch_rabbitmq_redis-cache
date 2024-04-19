// var express = require('express');
// var router = express.Router();
// var controller = require('../controllers/PlanController.js');
//
// /* GET home page. */
// router.get('/demo/v1/get', async function (req, res, next) {
//   try {
//     const data = await controller.get(req, res);
//     res.render('renderedData',{data})
//   } catch {
//     res.status(500).send("Internal Server Error");
//     next();
//   }
// });
//
// /* GET specific object. */
// router.get('demon/v1/:objectId', controller.getId);
//
// /* POST new plan. */
// router.post('/demo/v1/post', async function (req, res, next) {
//   try {
//     const data = await controller.post(req, res);
//     res.status(201).send(data);
//   } catch {
//     res.status(500).send("Internal Server Error");
//     next();
//   }
// });
//
// /* DELETE specific object. */
// router.delete('/demo/v1/:objectId', controller.deleteId);
//
// module.exports = router;
